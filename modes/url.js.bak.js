// modes/url.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');
const log = require('../utils/logger');
const restoreSourcesFromMap = require('../utils/restoreSourcesFromMap');

// Optional override to trust self-signed certs (set in environment)
const insecureTLS = process.env.ALLOW_SELF_SIGNED === 'true';

if (insecureTLS) {
    log.warn('⚠️  ALLOW_SELF_SIGNED enabled — TLS certs will NOT be verified');
}

function downloadToFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;

        const options = {
            agent: url.startsWith('https') ?
                new https.Agent({ rejectUnauthorized: !insecureTLS }) : undefined,
        };

        const file = fs.createWriteStream(filepath);

        client.get(url, options, res => {
            if (res.statusCode !== 200) {
                log.error(`❌ Failed to download ${url} (status ${res.statusCode})`);
                return reject(new Error(`HTTP ${res.statusCode}`));
            }

            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', err => {
            fs.unlink(filepath, () => reject(err));
        });
    });
}

module.exports = async function(url) {
    try {
        const { hostname } = new URL(url);
        const BASE_DIR = path.resolve(__dirname, `../output/${hostname}`);
        const DOWNLOAD_DIR = path.join(BASE_DIR, 'downloaded_site');
        const RESTORE_DIR = path.join(BASE_DIR, 'restored_sources');

        const dom = await JSDOM.fromURL(url, {
            runScripts: 'outside-only', // disables all script execution
            resources: 'usable',
            pretendToBeVisual: false,
        });

        const { window } = dom;
        const scripts = window.document.querySelectorAll('script[src]');

        log.info(`🔍 Found ${scripts.length} script tag(s) on ${url}`);

        if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
        if (!fs.existsSync(RESTORE_DIR)) fs.mkdirSync(RESTORE_DIR, { recursive: true });

        for (const script of scripts) {
            const scriptUrl = new URL(script.src, url).href;
            const filename = path.basename(scriptUrl);
            const filepath = path.join(DOWNLOAD_DIR, filename);

            try {
                await downloadToFile(scriptUrl, filepath);
                log.info(`✅ Downloaded script: ${filename}`);

                const contents = fs.readFileSync(filepath, 'utf-8');
                const lines = contents.trim().split('\n').reverse();

                let mapUrlRelative = null;
                for (const line of lines) {
                    const match = line.match(/sourceMappingURL\s*=\s*(.+)/i);
                    if (match) {
                        const candidate = match[1].trim();
                        if (!candidate.startsWith('data:')) {
                            mapUrlRelative = candidate;
                            break;
                        } else {
                            log.warn(`⚠️  Found embedded data URI in ${filename}, skipping`);
                        }
                    }
                }

                if (!mapUrlRelative) {
                    log.warn(`⚠️  No usable sourceMappingURL found at end of ${filename}`);
                    continue;
                }

                const mapUrl = new URL(mapUrlRelative, scriptUrl).href;
                const mapName = path.basename(mapUrl.split('?')[0]);
                const mapPath = path.join(DOWNLOAD_DIR, mapName);

                log.info(`🌐 Found sourcemap reference: ${mapUrl}`);

                try {
                    await downloadToFile(mapUrl, mapPath);
                    log.info(`✅ Downloaded sourcemap: ${mapName}`);
                    restoreSourcesFromMap(mapPath, RESTORE_DIR);
                } catch (err) {
                    log.error(`❌ Failed to download map from ${mapUrl}: ${err.message}`);
                }
            } catch (err) {
                log.error(`❌ Failed processing script ${filename}: ${err.message}`);
            }
        }
    } catch (err) {
        log.error(`❌ Failed to load page ${url}: ${err.message}`);
    }
};
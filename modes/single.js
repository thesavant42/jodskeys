// modes/single.js

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');
const restoreSourcesFromMap = require('../utils/restoreSourcesFromMap');
const { fetchToFile } = require('../utils/fetchInsecure');
const { extractInlineSourceMapFromFile } = require('../utils/inlineSourceMap');

module.exports = async function(scriptUrl) {
    try {
        const { hostname } = new URL(scriptUrl);
        const BASE_DIR = path.resolve(__dirname, `../output/${hostname}`);
        const DOWNLOAD_DIR = path.join(BASE_DIR, 'downloaded_site');
        const RESTORE_DIR = path.join(BASE_DIR, 'restored_sources');

        if (!fs.existsSync(DOWNLOAD_DIR)) fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
        if (!fs.existsSync(RESTORE_DIR)) fs.mkdirSync(RESTORE_DIR, { recursive: true });

        const filename = path.basename(scriptUrl);
        const filepath = path.join(DOWNLOAD_DIR, filename);

        await fetchToFile(scriptUrl, filepath);
        log.info(`✅ Downloaded script: ${filename}`);

        const inlineResult = extractInlineSourceMapFromFile(filepath);
        if (inlineResult) {
            const syntheticMapPath = filepath + '.inline.map';
            fs.writeFileSync(syntheticMapPath, JSON.stringify(inlineResult.map, null, 2));
            log.info(`🧩 Saved inline sourcemap: ${path.basename(syntheticMapPath)}`);
            restoreSourcesFromMap(syntheticMapPath, RESTORE_DIR);
            return;
        }

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
            return;
        }

        const mapUrl = new URL(mapUrlRelative, scriptUrl).href;
        const mapName = path.basename(mapUrl.split('?')[0]);
        const mapPath = path.join(DOWNLOAD_DIR, mapName);

        log.info(`🌐 Found sourcemap reference: ${mapUrl}`);

        try {
            await fetchToFile(mapUrl, mapPath);
            log.info(`✅ Downloaded sourcemap: ${mapName}`);
            restoreSourcesFromMap(mapPath, RESTORE_DIR);
        } catch (err) {
            log.error(`❌ Failed to download map from ${mapUrl}: ${err.message}`);
        }
    } catch (err) {
        log.error(`❌ Failed processing single URL ${scriptUrl}: ${err.message}`);
    }
};
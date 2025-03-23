// url.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { JSDOM } = require('jsdom');
const log = require('../utils/logger');
const local = require('./local');

function download(url) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        client.get(url, res => {
            if (res.statusCode !== 200) return reject(new Error(`Request failed: ${url}`));
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => resolve(data));
        }).on('error', reject);
    });
}

function downloadToFile(url, filepath) {
    return new Promise((resolve, reject) => {
        const client = url.startsWith('https') ? https : http;
        const file = fs.createWriteStream(filepath);
        client.get(url, res => {
            if (res.statusCode !== 200) return reject(new Error(`Download failed: ${url}`));
            res.pipe(file);
            file.on('finish', () => file.close(resolve));
        }).on('error', err => {
            fs.unlinkSync(filepath);
            reject(err);
        });
    });
}

module.exports = async function(targetUrl) {
    const domain = new URL(targetUrl).hostname;
    const baseOutput = path.join('output', domain);
    const DOWNLOAD_DIR = path.join(baseOutput, 'downloaded_site');
    const RESTORE_DIR = path.join(baseOutput, 'restored_sources');
    fs.mkdirSync(DOWNLOAD_DIR, { recursive: true });
    fs.mkdirSync(RESTORE_DIR, { recursive: true });

    log.info(`Fetching page: ${targetUrl}`);
    const html = await download(targetUrl);
    const dom = new JSDOM(html);
    const scripts = Array.from(dom.window.document.querySelectorAll('script[src]'));

    for (const script of scripts) {
        const scriptUrl = new URL(script.src, targetUrl).href;
        const filename = path.basename(scriptUrl.split('?')[0]);
        const filePath = path.join(DOWNLOAD_DIR, filename);
        log.info(`Downloading script: ${scriptUrl}`);
        await downloadToFile(scriptUrl, filePath);

        const contents = fs.readFileSync(filePath, 'utf-8');
        const mapRef = contents.match(/[#@]\s*sourceMappingURL\s*=\s*(.*\.map)/i);
        if (mapRef) {
            if (mapRef[1].startsWith('data:')) {
                log.warn(`Skipping embedded data: URI in ${filename}`);
                continue;
            }
            const rawMap = mapRef[1].trim();
            const encodedMap = encodeURI(rawMap);
            const mapUrl = new URL(encodedMap, scriptUrl).href;
            const mapName = path.basename(mapUrl.split('?')[0]);
            const mapPath = path.join(DOWNLOAD_DIR, mapName);
            log.info(`Found sourcemap reference: ${mapUrl}`);
            await downloadToFile(mapUrl, mapPath);
        }
    }

    log.info(`Running local restore on: ${DOWNLOAD_DIR}`);
    await local(DOWNLOAD_DIR, '--recursive', RESTORE_DIR);
};
// utils/inlineSourceMap.js

const fs = require('fs');
const path = require('path');
const log = require('./logger');

function extractBase64Map(line) {
    const match = line.match(/sourceMappingURL\s*=\s*data:application\/json[^,]*;base64,([a-zA-Z0-9+/=]+)/);
    if (!match) return null;

    try {
        const decoded = Buffer.from(match[1], 'base64').toString('utf8');
        const map = JSON.parse(decoded);
        return map;
    } catch (err) {
        log.warn(`⚠️  Failed to decode or parse inline sourcemap: ${err.message}`);
        return null;
    }
}

function extractInlineSourceMapFromFile(jsFilePath) {
    try {
        const contents = fs.readFileSync(jsFilePath, 'utf-8');
        const lines = contents.trim().split('\n').reverse();

        for (const line of lines) {
            if (line.includes('sourceMappingURL=data:application/json')) {
                const map = extractBase64Map(line);
                if (map) {
                    log.info(`📎 Extracted inline sourcemap from ${path.basename(jsFilePath)}`);
                    return { map, source: jsFilePath };
                }
            }
        }
    } catch (err) {
        log.error(`❌ Failed to read or scan file ${jsFilePath}: ${err.message}`);
    }
    return null;
}

module.exports = {
    extractInlineSourceMapFromFile,
    extractBase64Map // exposed for testing/debugging
};
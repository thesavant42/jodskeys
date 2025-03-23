// single.js

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

function timestampedOutputDir(base = 'restored_sources') {
    const stamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
    return path.join(base, stamp);
}

module.exports = function(mapFilePath, outputDir) {
    if (!fs.existsSync(mapFilePath)) {
        log.error(`File not found: ${mapFilePath}`);
        return;
    }

    const finalOutputDir = outputDir || timestampedOutputDir();

    try {
        const map = JSON.parse(fs.readFileSync(mapFilePath, 'utf8'));
        log.info(`Loaded sourcemap: ${mapFilePath}`);

        map.sources.forEach((source, index) => {
            const content = map.sourcesContent?.[index];
            if (!content) return;

            let sanitizedPath = source
                .replace(/^webpack:\/\/+/, '')
                .replace(/^[A-Za-z]:/, '')
                .replace(/^\/\/+/, '')
                .replace(/[:*?"<>|]/g, '_')
                .replace(/\.\./g, '__');

            const outputPath = path.join(finalOutputDir, sanitizedPath);
            fs.mkdirSync(path.dirname(outputPath), { recursive: true });
            fs.writeFileSync(outputPath, content, 'utf8');
            log.info(`Restored: ${outputPath}`);
        });

    } catch (err) {
        log.error(`Failed to parse sourcemap: ${err.message}`);
    }
};
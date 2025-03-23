// local.js

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');

function walk(dir, recursive = false) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const filepath = path.join(dir, file);
        const stat = fs.statSync(filepath);
        if (stat && stat.isDirectory()) {
            if (recursive) results = results.concat(walk(filepath, true));
        } else if (file.endsWith('.map')) {
            results.push(filepath);
        }
    });
    return results;
}

module.exports = async function(inputDir, recursiveFlag = '', outputDir = 'restored_sources') {
    const recursive = recursiveFlag === '--recursive';
    const files = walk(inputDir, recursive);
    log.info(`Found ${files.length} .map files in ${inputDir}`);

    files.forEach(mapFile => {
        try {
            const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));
            const basePath = path.dirname(mapFile);
            map.sources.forEach((source, index) => {
                const content = map.sourcesContent?.[index];
                if (!content) return;

                let sanitizedPath = source
                    .replace(/^webpack:\/\/+/, '')
                    .replace(/^[A-Za-z]:/, '')
                    .replace(/^\/\/+/, '')
                    .replace(/[:*?"<>|]/g, '_')
                    .replace(/\.\./g, '__');

                const outputPath = path.join(outputDir, sanitizedPath);
                fs.mkdirSync(path.dirname(outputPath), { recursive: true });
                fs.writeFileSync(outputPath, content, 'utf8');
                log.info(`Restored: ${outputPath}`);
            });
        } catch (err) {
            log.warn(`Skipping invalid .map file: ${mapFile}`);
        }
    });
};
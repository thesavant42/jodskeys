// utils/restoreSourcesFromMap.js

const fs = require('fs');
const path = require('path');
const log = require('./logger');

module.exports = function restoreSourcesFromMap(mapPath, outputDir) {
    try {
        const raw = fs.readFileSync(mapPath, 'utf-8');
        const parsed = JSON.parse(raw);

        if (!parsed.sources || !parsed.sourcesContent) {
            log.warn(`⚠️  Sourcemap missing 'sourcesContent': ${mapPath}`);
            return;
        }

        parsed.sources.forEach((source, i) => {
            const content = parsed.sourcesContent[i];
            if (!content) {
                log.warn(`⚠️  No content for ${source}`);
                return;
            }

            const cleanName = path.basename(source)
                .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
                .replace(/\s+/g, '_')
                .replace(/\.+$/, '')
                .replace(/^\.*/, '')
                .slice(0, 255) || `source_${i}.js`;

            const outPath = path.join(outputDir, cleanName);
            fs.mkdirSync(path.dirname(outPath), { recursive: true });
            fs.writeFileSync(outPath, content, 'utf-8');
            log.info(`✅ Restored source: ${cleanName}`);
        });
    } catch (err) {
        log.error(`❌ Failed to restore sources from ${mapPath}: ${err.message}`);
    }
};
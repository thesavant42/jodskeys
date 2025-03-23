// modes/local.js

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');
const restoreSourcesFromMap = require('../utils/restoreSourcesFromMap');

function walkJsFiles(dir, fileList = []) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            walkJsFiles(fullPath, fileList);
        } else if (entry.isFile() && entry.name.endsWith('.js')) {
            fileList.push(fullPath);
        }
    }

    return fileList;
}

module.exports = function(inputDir = 'output') {
    try {
        const baseDir = path.resolve(inputDir);

        const domains = fs.readdirSync(baseDir, { withFileTypes: true })
            .filter(entry => entry.isDirectory())
            .map(entry => entry.name);

        for (const domain of domains) {
            const downloadPath = path.join(baseDir, domain, 'downloaded_site');
            const restorePath = path.join(baseDir, domain, 'restored_sources');

            if (!fs.existsSync(downloadPath)) {
                log.warn(`⚠️  No downloaded_site folder found for domain: ${domain}`);
                continue;
            }

            if (!fs.existsSync(restorePath)) {
                fs.mkdirSync(restorePath, { recursive: true });
            }

            const jsFiles = walkJsFiles(downloadPath);

            for (const jsFile of jsFiles) {
                try {
                    const contents = fs.readFileSync(jsFile, 'utf-8');
                    const lines = contents.trim().split('\n').reverse();

                    let mapFileName = null;

                    for (const line of lines) {
                        const match = line.match(/sourceMappingURL\s*=\s*(.+)/i);
                        if (match) {
                            const candidate = match[1].trim();
                            if (!candidate.startsWith('data:')) {
                                mapFileName = candidate.split('?')[0];
                                break;
                            }
                        }
                    }

                    if (!mapFileName) {
                        log.warn(`⚠️  No usable sourceMappingURL found at end of ${path.basename(jsFile)}`);
                        continue;
                    }

                    const mapPath = path.join(path.dirname(jsFile), mapFileName);
                    if (!fs.existsSync(mapPath)) {
                        log.warn(`❌ Map file not found: ${mapPath}`);
                        continue;
                    }

                    log.info(`📄 Processing map: ${mapPath}`);
                    restoreSourcesFromMap(mapPath, restorePath);
                } catch (err) {
                    log.error(`❌ Error processing ${jsFile}: ${err.message}`);
                }
            }
        }
    } catch (err) {
        log.error(`❌ Failed to scan local output: ${err.message}`);
    }
};
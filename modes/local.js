// modes/local.js

const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');
const restoreSourcesFromMap = require('../utils/restoreSourcesFromMap');
const { extractInlineSourceMapFromFile } = require('../utils/inlineSourceMap');
const summarizeSourcemapMetadata = require('../utils/extractMetadata');

module.exports = async function () {
  const outputDir = path.resolve(__dirname, '../output');
  const domains = fs.readdirSync(outputDir);

  for (const domain of domains) {
    const basePath = path.join(outputDir, domain);
    const downloadDir = path.join(basePath, 'downloaded_site');
    const restoreDir = path.join(basePath, 'restored_sources');

    if (!fs.existsSync(downloadDir)) {
      log.warn(`⚠️  Skipping ${domain}: downloaded_site folder not found.`);
      continue;
    }

    const files = fs.readdirSync(downloadDir).filter(file => file.endsWith('.map') || file.endsWith('.js'));

    for (const file of files) {
      const fullPath = path.join(downloadDir, file);

      if (file.endsWith('.map')) {
        try {
          restoreSourcesFromMap(fullPath, restoreDir);
          summarizeSourcemapMetadata(fullPath); // Added metadata extraction
        } catch (err) {
          log.error(`❌ Failed to restore sources from ${file}: ${err.message}`);
        }
      }

      if (file.endsWith('.js')) {
        try {
          const inlineResult = extractInlineSourceMapFromFile(fullPath);
          if (inlineResult) {
            const syntheticMapPath = fullPath + '.inline.map';
            fs.writeFileSync(syntheticMapPath, JSON.stringify(inlineResult.map, null, 2));
            log.info(`🧩 Saved inline sourcemap: ${path.basename(syntheticMapPath)}`);
            restoreSourcesFromMap(syntheticMapPath, restoreDir);
            summarizeSourcemapMetadata(syntheticMapPath); // Added metadata extraction
          }
        } catch (err) {
          log.warn(`⚠️ Inline extraction failed for ${file}: ${err.message}`);
        }
      }
    }
  }
};


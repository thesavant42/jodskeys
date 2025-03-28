const fs = require('fs');
const path = require('path');
const log = require('../utils/logger');
const restoreSourcesFromMap = require('../utils/restoreSourcesFromMap');
const { extractInlineSourceMapFromFile } = require('../utils/inlineSourceMap');
const summarizeSourcemapMetadata = require('../utils/extractMetadata');
const { extractFromDirectory } = require('../utils/extractBase64Assets');

module.exports = async function (target = null) {
  const outputRoot = path.resolve(__dirname, '../output');

  const targets = target
    ? [path.resolve(target)]
    : fs.readdirSync(outputRoot)
        .map(name => path.join(outputRoot, name))
        .filter(full => fs.lstatSync(full).isDirectory());

  for (const domainPath of targets) {
    const domain = path.basename(domainPath);
    const downloadDir = path.join(domainPath, 'downloaded_site');
    const restoreDir = path.join(domainPath, 'restored_sources');
    const assetsDir = path.join(domainPath, 'extracted_assets');

    if (!fs.existsSync(downloadDir)) {
      log.warn(`⚠️ Skipping ${domain}: downloaded_site folder not found.`);
      continue;
    }

    const files = fs.readdirSync(downloadDir).filter(file => file.endsWith('.map') || file.endsWith('.js'));

    for (const file of files) {
      const fullPath = path.join(downloadDir, file);

      if (file.endsWith('.map')) {
        try {
          restoreSourcesFromMap(fullPath, restoreDir);
          summarizeSourcemapMetadata(fullPath);
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
            log.info(`💡 Saved inline sourcemap: ${path.basename(syntheticMapPath)}`);
            restoreSourcesFromMap(syntheticMapPath, restoreDir);
            summarizeSourcemapMetadata(syntheticMapPath);
          }
        } catch (err) {
          log.warn(`⚠️ Inline extraction failed for ${file}: ${err.message}`);
        }
      }
    }

    log.info(`📦 Scanning for embedded base64 assets in: ${restoreDir}`);
    const extracted = extractFromDirectory(restoreDir, assetsDir);
    log.info(`🎉 Extracted ${extracted} embedded image/font asset(s) to: ${assetsDir}`);
  }
};

const fs = require('fs');
const path = require('path');
const logger = require('./logger');

function sanitizePathSegment(segment) {
  return segment
    .replace(/[<>:"\\|?*\x00-\x1F]/g, '') // remove illegal characters
    .replace(/\s+/g, '_')                 // spaces to underscores
    .replace(/\.+$/, '')                  // trailing dots
    .replace(/^\.*/, '');                 // leading dots
}

function restoreSourcesFromMap(mapOrPath, outputDir) {
  let map;

  if (typeof mapOrPath === 'string') {
    try {
      const raw = fs.readFileSync(mapOrPath, 'utf-8');
      map = JSON.parse(raw);
    } catch (err) {
      logger.error(`❌ Failed to read or parse sourcemap file at ${mapOrPath}: ${err.message}`);
      return;
    }
  } else {
    map = mapOrPath;
  }

  const sources = map.sources || [];
  const contents = map.sourcesContent || [];

  logger.info(`📦 Map contains ${sources.length} sources`);
  logger.info(`📦 Map has ${contents.length} contents`);

  if (!contents || contents.length === 0) {
    logger.warn(`⚠️ No sourcesContent found — nothing to restore.`);
    return;
  }

  sources.forEach((source, i) => {
    try {
      const content = contents[i];
      if (!content) {
        logger.warn(`⚠️ Missing content for source[${i}]: ${source}`);
        return;
      }

      let virtualPath = source
        .replace(/^webpack:\/\//, '')
        .replace(/^(\.\/)+/, '');

      // Normalize and sanitize each path segment individually
      const parts = path.normalize(virtualPath).split(path.sep);
      const sanitizedParts = parts.map(sanitizePathSegment).filter(Boolean);
      virtualPath = path.join(...sanitizedParts);

      if (!virtualPath || virtualPath.length > 255) {
        virtualPath = `source_${i}.js`;
      }

      const outPath = path.join(outputDir, virtualPath);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, content, 'utf-8');
      logger.info(`✅ Restored source: ${virtualPath}`);
    } catch (err) {
      logger.warn(`⚠️ Failed to restore source[${i}] (${source}): ${err.message}`);
    }
  });
}

module.exports = restoreSourcesFromMap;

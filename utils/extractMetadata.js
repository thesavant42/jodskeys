// utils/extractMetadata.js

const fs = require('fs');
const path = require('path');
const log = require('./logger');

function summarizeSourcemapMetadata(mapPath) {
  try {
    const raw = fs.readFileSync(mapPath, 'utf-8');
    const json = JSON.parse(raw);

    const metadata = {
      file: json.file || '—',
      version: json.version,
      sourceCount: json.sources?.length || 0,
      hasSourcesContent: Array.isArray(json.sourcesContent),
      namesCount: json.names?.length || 0,
      hasMappings: typeof json.mappings === 'string' && json.mappings.length > 0,
      sourceRoot: json.sourceRoot || null,
      sections: json.sections?.length || 0,
      toolchainHints: [],
    };

    if ('x_facebook_sources' in json) metadata.toolchainHints.push('Facebook (Metro bundler)');
    if ('x_google_ignoreList' in json) metadata.toolchainHints.push('Chrome DevTools');
    if (metadata.sourceRoot?.includes('webpack')) metadata.toolchainHints.push('Webpack');
    if (json.sources?.some(src => src.startsWith('webpack://'))) metadata.toolchainHints.push('Webpack');

    log.info(`📊 Metadata for ${path.basename(mapPath)}:`);
    log.info(`   version: ${metadata.version}`);
    log.info(`   file: ${metadata.file}`);
    log.info(`   sources: ${metadata.sourceCount}`);
    log.info(`   has sourcesContent: ${metadata.hasSourcesContent}`);
    log.info(`   names count: ${metadata.namesCount}`);
    log.info(`   has mappings: ${metadata.hasMappings}`);
    log.info(`   sourceRoot: ${metadata.sourceRoot}`);
    log.info(`   sections: ${metadata.sections}`);
    if (metadata.toolchainHints.length) {
      log.info(`   toolchain hints: ${metadata.toolchainHints.join(', ')}`);
    }

    return metadata;
  } catch (err) {
    log.warn(`⚠️ Failed to parse metadata for ${path.basename(mapPath)}: ${err.message}`);
    return null;
  }
}

module.exports = summarizeSourcemapMetadata;


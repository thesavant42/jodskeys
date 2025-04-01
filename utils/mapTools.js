// File: utils/mapTools.js

const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

function sanitize(filePath) {
  return filePath.replace(/^\/+/, '')
    .replace(/\.\.{2,}/g, '__')
    .replace(/\\/g, '/')
    .replace(/[^a-zA-Z0-9_\-/\.]/g, '_');
}

async function restoreSourcesFromMap(mapPath, mapJson, options = {}) {
  if (!mapJson.sources || !mapJson.sourcesContent) {
    console.warn(chalk.yellow('⚠️  Map is missing sources or sourcesContent. Cannot restore.'));
    return;
  }

  const baseOutDir = options.output || 'restored';
  const mapFileName = path.basename(mapPath);
  const bundleName = mapFileName.replace(/\.map$/, '');
  const outDir = path.join(baseOutDir, bundleName);

  fs.mkdirSync(outDir, { recursive: true });

  for (let i = 0; i < mapJson.sources.length; i++) {
    const sourcePath = sanitize(mapJson.sources[i]);
    const content = mapJson.sourcesContent[i];

    if (!content) continue;

    const fullPath = path.join(outDir, sourcePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });

    fs.writeFileSync(fullPath, content, 'utf-8');
    console.log(chalk.green(`📄 Restored: ${fullPath}`));
  }
}

module.exports = {
  restoreSourcesFromMap,
};

// voorhies.js — JSON carving + manifest recon for impacted JS
// Author: savant42

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const inputFile = process.argv[2];
if (!inputFile) {
  console.error('Usage: node voorhies.js <path_to_chunk.js>');
  process.exit(1);
}

const outputDir = path.join(__dirname, 'carved_sources');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir);
}

const restoredDir = path.join(__dirname, 'restored_sources');
let restoredCount = 0;
if (fs.existsSync(restoredDir)) {
  const walk = (dir) => fs.readdirSync(dir).reduce((acc, file) => {
    const full = path.join(dir, file);
    return acc + (fs.statSync(full).isDirectory() ? walk(full) : 1);
  }, 0);
  restoredCount = walk(restoredDir);
}

const heuristics = [
  {
    match: json => json.pipelineId && json.buildUrl,
    name: 'build_meta'
  },
  {
    match: json => json.version && json.scmCommit,
    name: 'gitlab_info'
  },
  {
    match: json => json.dependencies && json.name,
    name: 'package_info'
  },
];

let extractedCount = 0;
let manifestCount = 0;

function extractJsonFromFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const regex = /JSON\.parse\('([^']+)'\)/g;
  let match;
  let count = 0;

  while ((match = regex.exec(content)) !== null) {
    try {
      const raw = match[1].replace(/\\"/g, '"');
      const parsed = JSON.parse(raw);
      const heuristic = heuristics.find(h => h.match(parsed));
      const label = heuristic ? heuristic.name : `chunk_${count}`;
      const baseName = path.basename(filePath);
      const filename = `json_${baseName}_${label}.json`;
      const outputPath = path.join(outputDir, filename);
      fs.writeFileSync(outputPath, JSON.stringify(parsed, null, 2));
      console.log(`✅ Extracted JSON saved to: ${outputPath}`);
      count++;
    } catch (err) {
      console.warn(`⚠️  Failed to parse JSON at match: ${match.index}`, err.message);
    }
  }

  extractedCount = count;

  if (count === 0) {
    console.log('🟡 No embedded JSON.parse() blocks found.');
  }
}

function extractMapManifest(chunkPath) {
  const baseName = path.basename(chunkPath);
  let mapPath;

  try {
    const lines = fs.readFileSync(chunkPath, 'utf8').split('\n');
    const sourceMapLine = lines.reverse().find(line => line.includes('sourceMappingURL'));
    if (sourceMapLine) {
      const match = sourceMapLine.match(/sourceMappingURL=(.*)/);
      if (match) {
        const relativeMap = match[1].trim();
        mapPath = path.resolve(path.dirname(chunkPath), relativeMap);
      }
    }
  } catch (err) {
    console.warn(`⚠️  Failed to read sourceMappingURL from: ${chunkPath}`);
  }

  if (!mapPath || !fs.existsSync(mapPath)) {
    const fallbackGuesses = [
      `${chunkPath}.map`,
      path.join(path.dirname(chunkPath), `main.${baseName.replace(/\.chunk\.js$/, '')}.bundle.map`)
    ];
    mapPath = fallbackGuesses.find(p => fs.existsSync(p));
  }

  if (!mapPath || !fs.existsSync(mapPath)) {
    console.warn(`🟥 Map file not found for chunk: ${chunkPath}`);
    return;
  }

  try {
    const mapJson = JSON.parse(fs.readFileSync(mapPath, 'utf8'));
    if (mapJson.sources && Array.isArray(mapJson.sources)) {
      manifestCount = mapJson.sources.length;
      const manifestPath = path.join(outputDir, `manifest_${baseName}.txt`);
      fs.writeFileSync(manifestPath, mapJson.sources.join('\n'));
      console.log(`📄 Scavenger manifest written to: ${manifestPath}`);
    } else {
      console.warn(`⚠️  No valid "sources" array in: ${mapPath}`);
    }
  } catch (err) {
    console.error(`💥 Error parsing map file: ${mapPath}`, err.message);
  }
}

extractJsonFromFile(inputFile);
extractMapManifest(inputFile);

console.log(`\n📊 Summary:`);
console.log(`  🧩 Extracted JSON files: ${extractedCount}`);
console.log(`  🗂️  Files listed in manifest: ${manifestCount}`);
console.log(`  📦 Files extracted into restored_sources: ${restoredCount}`);
if (manifestCount > 0) {
  const percent = ((extractedCount / manifestCount) * 100).toFixed(1);
  console.log(`  🔍 JSON Coverage: ${percent}% of manifest has JSON extracted.`);
  const restoredPercent = ((restoredCount / manifestCount) * 100).toFixed(1);
  console.log(`  💾 Restore Coverage: ${restoredPercent}% of manifest restored.`);
}


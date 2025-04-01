// File: scripts/buildManifest-scraper.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const mkdirp = require('mkdirp');
const { SourceMapConsumer } = require('source-map');

const BASE_URL = 'https://ssktjl.bugs.wbgames.com/';
const MANIFEST_URL = BASE_URL + '_next/static/ThprviGe2sUjBkPgFR3sQ/_buildManifest.js';
const OUTPUT_DIR = path.join(__dirname, '../restored');

async function fetchManifest() {
  const res = await fetch(MANIFEST_URL);
  const js = await res.text();
  const manifestMatch = js.match(/self\.__BUILD_MANIFEST\s*=\s*\(function.*?\}\}\((.*?)\)\);/s);
  if (!manifestMatch) throw new Error('Manifest format not recognized.');
  const args = JSON.parse('[' + manifestMatch[1].replace(/"/g, '"') + ']');
  return args.filter(str => str.endsWith('.js'));
}

async function tryDownloadMap(jsPath) {
  const mapPath = jsPath + '.map';
  const fullUrl = BASE_URL + mapPath.replace(/^static\//, '_next/static/');

  try {
    const res = await fetch(fullUrl);
    if (!res.ok || !res.headers.get('content-type')?.includes('json')) {
      console.warn(`⚠️  Skipped (not a JSON map): ${fullUrl}`);
      return null;
    }
    const json = await res.json();
    return { json, mapUrl: fullUrl };
  } catch (e) {
    console.warn(`❌ Failed to fetch map: ${fullUrl}`, e.message);
    return null;
  }
}

async function restoreSources(mapJson, outputDir) {
  await SourceMapConsumer.with(mapJson, null, async consumer => {
    for (let i = 0; i < consumer.sources.length; i++) {
      const source = consumer.sources[i];
      const content = consumer.sourceContentFor(source, true);
      const safePath = source.replace(/^webpack:\/\/\/?/, '').replace(/\.\.\//g, '').replace(/^\/+/, '');
      const fullPath = path.join(outputDir, safePath);
      mkdirp.sync(path.dirname(fullPath));
      fs.writeFileSync(fullPath, content || '', 'utf8');
      console.log(`✅ Restored: ${safePath}`);
    }
  });
}

(async () => {
  console.log(`🌐 Fetching manifest: ${MANIFEST_URL}`);
  const jsChunks = await fetchManifest();

  const uniqueMaps = new Set(jsChunks.map(j => j + '.map'));
  for (const map of uniqueMaps) {
    const result = await tryDownloadMap(map);
    if (result) {
      console.log(`📦 Processing ${result.mapUrl}`);
      await restoreSources(result.json, OUTPUT_DIR);
    }
    await new Promise(resolve => setTimeout(resolve, 500)); // Cool-off
  }

  console.log('🎉 Done.');
})();

const fs = require('fs');
const path = require('path');

const regex = /^export default\s+"data:(.+?);base64,(.+)";?$/;

const MIME_MAP = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/svg+xml': 'svg',
  'font/woff': 'woff',
  'font/woff2': 'woff2',
  'font/ttf': 'ttf',
  'application/vnd.ms-fontobject': 'eot',
  'application/font-sfnt': 'sfnt',
  'application/font-woff': 'woff',
  'application/octet-stream': 'bin'
};

function stripAllExtensions(filename) {
  return filename.split('.').slice(0, -1).join('.') || filename;
}

function extractBase64FromFile(filePath, outputDir) {
  const text = fs.readFileSync(filePath, 'utf8').trim();
  const match = text.match(regex);
  if (!match) return false;

  const mime = match[1];
  const base64 = match[2];
  const fallback = mime.split('/')[1]?.split('+')[0] || 'bin';
  const ext = MIME_MAP[mime] || fallback;

  const rawName = path.basename(filePath);
  const cleanBase = stripAllExtensions(rawName);
  const filename = cleanBase + '.' + ext;

  const outputPath = path.join(outputDir, filename);
  fs.mkdirSync(outputDir, { recursive: true });
  fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'));
  return outputPath;
}

function extractFromDirectory(inputDir, outputDir) {
  let count = 0;
  function walk(dir) {
    fs.readdirSync(dir).forEach((file) => {
      const full = path.join(dir, file);
      const stat = fs.statSync(full);
      if (stat.isDirectory()) return walk(full);
      if (stat.isFile()) {
        const extracted = extractBase64FromFile(full, outputDir);
        if (extracted) {
          count++;
          console.log(`✅ Extracted: ${extracted}`);
        }
      }
    });
  }
  walk(inputDir);
  return count;
}

module.exports = { extractFromDirectory };

// File: utils/fetchPage.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const https = require('https');

// Accept self-signed certs
const agent = new https.Agent({ rejectUnauthorized: false });

function sanitizeFileName(url) {
  return url.replace(/[^a-z0-9]/gi, '_').toLowerCase();
}

async function fetchToMemory(url) {
  const res = await fetch(url, { agent });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return await res.text();
}

async function fetchHeadersOnly(url) {
  const res = await fetch(url, { method: 'HEAD', agent });
  return res;
}

async function fetchToFile(url, options = {}) {
  const res = await fetch(url, { agent });
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);

  const fileName = sanitizeFileName(url);
  const outPath = path.join(options.tempDir || 'tmp', fileName);
  await fs.promises.mkdir(path.dirname(outPath), { recursive: true });
  const dest = fs.createWriteStream(outPath);
  await streamPipeline(res.body, dest);

  let mapJson = null;
  try {
    const contents = await fs.promises.readFile(outPath, 'utf8');
    mapJson = JSON.parse(contents);
  } catch (err) {
    console.warn(`⚠️  Could not parse map file as JSON: ${err.message}`);
  }

  return { filePath: outPath, mapJson };
}

module.exports = {
  fetchToMemory,
  fetchHeadersOnly,
  fetchToFile,
};

// utils/fetchInsecure.js

const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

function fetchToMemory(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      agent: url.startsWith('https') ? insecureAgent : undefined,
    };

    let data = '';
    client.get(url, options, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} when fetching ${url}`));
      }

      res.setEncoding('utf8');
      res.on('data', chunk => (data += chunk));
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function fetchToFile(url, filepath) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const options = {
      agent: url.startsWith('https') ? insecureAgent : undefined,
    };

    const file = fs.createWriteStream(filepath);
    client.get(url, options, res => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} when downloading ${url}`));
      }

      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(filepath, () => reject(err));
    });
  });
}

module.exports = {
  fetchToMemory,
  fetchToFile,
};


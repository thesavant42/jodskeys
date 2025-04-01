const fs = require('fs');
const path = require('path');
const axios = require('axios');
const beautify = require('js-beautify').js;

const SUSPICIOUS_WORDS = [
  'apikey', 'api_key', 'x-api-key', 'privatetoken', 'privatekey',
  'clientSecret', 'cognito', 'access_token'
];

const API_KEY_PATTERN = /(api[-_]?key|secret)[^=\n]{0,20}[:=][^\n]+/i;
const PASSWORD_PATTERN = /(passphrase|pwd)[^=\n]{0,20}[:=][^\n]+/i;
const JWT_PATTERN = /[\w-]{24,}\.[\w-]{6,}\.[\w-]{27,}/g;

const DOWNLOAD_FILETYPES = /['"`](https?:\/\/|\/|\.\.\/|\.\/)[^'"`\n]+?\.(zip|rar|7z|pdf|docx?|xlsx?|tar\.gz|gz)(\?[^\s'"`]*)?['"`]/i;

const MAX_DISPLAY_LEN = 120;
const SOURCE_MAP_PATTERN = /sourceMappingURL=([^\s]+)/i; // Regex to find source map URL
const CARVED_JSON_DIR = 'carved_sources';

// Utility function to truncate the content for display purposes
function truncateDisplay(str, maxLength = MAX_DISPLAY_LEN) {
  return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
}

// Helper function to detect packed code
function isPacked(content) {
  return content.length > 500 && content.indexOf('function') === -1;
}

// Check for source map in the code
function findSourceMap(content, filePath) {
  const match = content.match(SOURCE_MAP_PATTERN);
  if (match) {
    const mapUrl = match[1].trim();
    if (mapUrl.startsWith('http') || mapUrl.startsWith('https')) {
      return mapUrl;
    } else {
      const mapFile = path.resolve(path.dirname(filePath), mapUrl);
      return mapFile;
    }
  }
  return null;
}

// Beautify packed code
function beautifyCode(content) {
  return beautify(content, { indent_size: 2 });
}

// Try to fetch the source map file and return its content
async function fetchSourceMap(mapUrl) {
  try {
    const response = await axios.get(mapUrl);
    return response.data;
  } catch (err) {
    console.error(`Failed to fetch source map at ${mapUrl}: ${err}`);
    return null;
  }
}

// Process JSON from inline JSON.parse() calls
function extractJsonFromJsonParse(content) {
  const jsonMatches = [];
  const JSON_PARSE_PATTERN = /JSON\.parse\(['"`](.*?)['"`]\)/g;
  let match;

  // Find and parse JSON strings
  while ((match = JSON_PARSE_PATTERN.exec(content)) !== null) {
    const jsonString = match[1].trim();
    try {
      const parsedJson = JSON.parse(jsonString);
      jsonMatches.push(parsedJson);
    } catch (e) {
      console.error("Error parsing JSON:", e);
    }
  }
  return jsonMatches;
}

// Process JSON objects for suspicious data
function scanJsonForSecrets(parsedJson) {
  const secretMatches = [];
  function deepScan(jsonObj) {
    if (typeof jsonObj === 'string') {
      SUSPICIOUS_WORDS.forEach(word => {
        if (jsonObj.toLowerCase().includes(word)) {
          secretMatches.push({ type: '🕵️ Suspicious Word', content: jsonObj });
        }
      });
    } else if (Array.isArray(jsonObj)) {
      jsonObj.forEach(item => deepScan(item));
    } else if (typeof jsonObj === 'object' && jsonObj !== null) {
      Object.values(jsonObj).forEach(value => deepScan(value));
    }
  }
  deepScan(parsedJson);
  return secretMatches;
}

// Store carved JSON to a separate directory
function storeCarvedJson(jsonObj, filePath, lineNumber) {
  const fileName = `${path.basename(filePath)}_line${lineNumber}.json`;
  const fileDir = path.join(__dirname, '..', CARVED_JSON_DIR);
  if (!fs.existsSync(fileDir)) {
    fs.mkdirSync(fileDir);
  }

  const filePathToWrite = path.join(fileDir, fileName);
  fs.writeFileSync(filePathToWrite, JSON.stringify(jsonObj, null, 2));
  console.log(`Stored carved JSON at: ${filePathToWrite}`);
  return filePathToWrite;
}

// Process impacted files (carving them)
function carveImpactedFile(content) {
  console.log('This file is IMPACTED and needs manual inspection or carving.');
  return content.split(';').map(str => str.trim() + ';').join('\n');
}

// Scan a file for secrets and related data
async function scanFile(filepath, domainRoot, includeSusWords, domainSet, verbosity, flagMimes) {
  const findings = [];
  const content = fs.readFileSync(filepath, 'utf-8');
  const isFilePacked = isPacked(content);

  let sourceMap = null;
  let restoredSource = null;

  if (isFilePacked) {
    sourceMap = findSourceMap(content, filepath);

    // If source map found, attempt to restore the original code
    if (sourceMap) {
      restoredSource = await fetchSourceMap(sourceMap);
      if (restoredSource) {
        findings.push({ type: '📜 Restored Source from Map', line: 0, content: restoredSource });
      }
    }

    if (!restoredSource) {
      // If no map found, try to beautify the code
      const beautifiedCode = beautifyCode(content);
      findings.push({ type: '🖌️ Beautified Code', line: 0, content: beautifiedCode });
    }
  }

  if (!restoredSource && isFilePacked) {
    // Carve impacted files
    const impactedContent = carveImpactedFile(content);
    findings.push({ type: '⚠️ IMPACTED JavaScript', line: 0, content: impactedContent });
  }

  // Extract and scan any inline JSON blocks
  const jsonBlobs = extractJsonFromJsonParse(content);
  jsonBlobs.forEach((parsedJson, index) => {
    const filePathToWrite = storeCarvedJson(parsedJson, filepath, index + 1);
    const secrets = scanJsonForSecrets(parsedJson);
    findings.push(...secrets);
    findings.push({ type: '📂 Carved JSON', line: index + 1, content: filePathToWrite, display: filePathToWrite });
  });

  // Continue scanning for other secrets in the file
  const lines = content.split('\n');
  lines.forEach((line, i) => {
    const trimmed = line.trim();
    const display = truncateDisplay(trimmed);

    if (API_KEY_PATTERN.test(line)) {
      findings.push({ type: '🔐 API Key', line: i + 1, content: trimmed, display });
    }
    if (PASSWORD_PATTERN.test(line)) {
      findings.push({ type: '🔑 Password', line: i + 1, content: trimmed, display });
    }
    if (JWT_PATTERN.test(line)) {
      findings.push({ type: '🔑 JWT Token', line: i + 1, content: trimmed, display });
    }
  });

  return findings.length ? { file: filepath, findings } : null;
}

// Scan directory and process files
function scanDirectory(targetDir, domainRoot, report, includeSusWords, verbosity, domainSet, flagMimes) {
  const files = fs.readdirSync(targetDir);
  files.forEach((file) => {
    const filepath = path.join(targetDir, file);
    const stat = fs.statSync(filepath);
    if (stat.isDirectory()) {
      scanDirectory(filepath, domainRoot, report, includeSusWords, verbosity, domainSet, flagMimes);  // Recurse into subdirectories
    } else {
      const result = scanFile(filepath, domainRoot, includeSusWords, domainSet, verbosity, flagMimes);
      if (result) {
        report.push(result);
        console.log(`\n[🔍] ${result.file}`);
        result.findings.forEach(f => {
          console.log(`  - ${f.type}: line ${f.line} — ${f.display}`);
        });
      }
    }
  });
}

function parseArgs() {
  const args = process.argv.slice(2);
  const result = { includeSusWords: false, verbose: 1, flagMimes: false };

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--output-dir' && args[i + 1]) {
      result.outputDir = args[i + 1];
      i++;
    }
    if (args[i] === '--domain' && args[i + 1]) {
      result.domain = args[i + 1];
      i++;
    }
    if (args[i] === '--report-file' && args[i + 1]) {
      result.reportFile = args[i + 1];
      i++;
    }
    if (args[i] === '--sus-words') {
      result.includeSusWords = true;
    }
    if (args[i] === '--verbose' && args[i + 1]) {
      result.verbose = parseInt(args[i + 1]);
      i++;
    }
    if (args[i] === '--flag-mime') {
      result.flagMimes = true;
    }
  }
  return result;
}

function main() {
  const args = parseArgs();
  const report = [];
  const externalDomains = new Set();
  let domain = 'unknown';

  if (args.outputDir) {
    const resolved = path.resolve(args.outputDir);
    domain = path.basename(path.dirname(resolved));
    scanDirectory(resolved, domain, report, args.includeSusWords, args.verbose, externalDomains, args.flagMimes);
  } else if (args.domain) {
    domain = args.domain;
    const root = path.join(__dirname, '..', 'output', domain);
    const subdirs = ['restored_sources', 'downloaded_site'];
    for (const dir of subdirs) {
      const full = path.join(root, dir);
      scanDirectory(full, domain, report, args.includeSusWords, args.verbose, externalDomains, args.flagMimes);
    }
  } else {
    console.error('Usage: node loot.js --output-dir <path> OR --domain <example.com>');
    process.exit(1);
  }

  if (report.length > 0) {
    const reportPath = args.reportFile
      ? path.resolve(args.reportFile)
      : generateDefaultLogFile(domain);
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    if (args.verbose >= 2) {
      console.log(`\n📄 Loot report written to ${reportPath}`);
    }
  } else if (args.verbose >= 2) {
    console.log('\n✅ No suspicious artifacts found. Your loot appears clean.');
  }

  if (args.verbose >= 2 && externalDomains.size > 0) {
    console.log(`\n🌐 Unique external domains found:`);
    [...externalDomains].sort().forEach(d => console.log(`  - ${d}`));
  }
}

main();

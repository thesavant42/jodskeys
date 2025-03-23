// test/test_restoreSourcesFromMap.js

const path = require('path');
const restoreSourcesFromMap = require('../utils/restoreSourcesFromMap');

const mapPath = path.resolve(__dirname, 'mock-bundle.js.map');
const outputDir = path.resolve(__dirname, 'test_output');

console.log(`🧪 Restoring sources from: ${mapPath}`);
console.log(`📁 Output directory: ${outputDir}`);

restoreSourcesFromMap(mapPath, outputDir);


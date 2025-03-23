#!/usr/bin/env node
const chalk = require('chalk');
const path = require('path');
const log = require('./utils/logger');
const [,, mode, ...args] = process.argv;

console.log(chalk.blueBright(`\n🔑  joddskeys — Skeleton key for sourcemap extraction`));
console.log(chalk.gray(`📄  Logging to: ${log.logPath}\n`));
log.info(`--- joddskeys launched in mode: ${mode} ---`);

switch (mode) {
  case 'local':
    require('./modes/local')(...args);
    break;
  case 'single':
    require('./modes/single')(...args);
    break;
  case 'url':
    require('./modes/url')(...args);
    break;
  default:
    const errMsg = `Unknown mode: ${mode}`;
    console.error(chalk.red(`❌ ${errMsg}`));
    log.error(errMsg);
    console.log(`\n${chalk.cyan('Usage:')} joddskeys <local|single|url> [args]\n`);
    process.exit(1);
}

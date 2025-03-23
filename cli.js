#!/usr/bin/env node
const chalk = require('chalk');
const path = require('path');
const log = require('./utils/logger');
const [,, mode, ...args] = process.argv;

console.log(chalk.blueBright(`\n🔑  jodskeys — Skeleton key for sourcemap extraction`));
console.log(chalk.gray(`📄  Logging to: ${log.logPath}\n`));
log.info(`--- jodskeys launched in mode: ${mode} ---`);

try {
  switch (mode) {
    case 'local': {
      const local = require('./modes/local');
      local(...args);
      break;
    }
    case 'single': {
      const single = require('./modes/single');
      single(...args);
      break;
    }
    case 'url': {
      const url = require('./modes/url');
      url(...args);
      break;
    }
    default: {
      const errMsg = `Unknown mode: ${mode}`;
      console.error(chalk.red(`❌ ${errMsg}`));
      log.error(errMsg);
      console.log(`\n${chalk.cyan('Usage:')} jodskeys <local|single|url> [args]\n`);
      process.exit(1);
    }
  }
} catch (err) {
  console.error(chalk.red(`💥 Error executing mode '${mode}': ${err.message}`));
  log.error(`Execution failure: ${err.stack}`);
  process.exit(1);
}

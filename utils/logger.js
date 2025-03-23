const fs = require('fs');
const path = require('path');
const chalk = require('chalk');

const logDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

const timestamp = new Date().toISOString().replace(/[:T]/g, '-').split('.')[0];
const logPath = path.join(logDir, `joddskeys-${timestamp}.log`);
const logStream = fs.createWriteStream(logPath, { flags: 'a' });

function write(type, message) {
  const time = new Date().toISOString();
  const entry = `[${time}] [${type}] ${message}\n`;
  logStream.write(entry);
  switch (type) {
    case 'INFO': console.log(chalk.green('INFO'), message); break;
    case 'WARN': console.warn(chalk.yellow('WARN'), message); break;
    case 'ERROR': console.error(chalk.red('ERROR'), message); break;
    default: console.log(message); break;
  }
}

module.exports = {
  info: msg => write('INFO', msg),
  warn: msg => write('WARN', msg),
  error: msg => write('ERROR', msg),
  log: msg => write('LOG', msg),
  logPath
};
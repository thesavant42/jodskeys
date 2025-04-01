// scanners/patterns.js
module.exports = {
  SUSPICIOUS_WORDS: [
    'apikey', 'api_key', 'x-api-key', 'privatetoken', 'privatekey',
    'clientSecret', 'cognito', 'access_token'
  ],
  DOWNLOAD_FILETYPES: /['"`](https?:\/\/|\/|\.\.\/|\.\/)[^'"`\n]+?\.(zip|rar|7z|pdf|docx?|xlsx?|tar\.gz|gz)(\?[^\s'"`]*)?['"`]/i,
  MIME_PATTERN: /['"]?application\/(zip|pdf|msword|vnd\.[\w.-]+)['"]?/i,
  API_KEY_PATTERN: /(api[-_]?key|secret)[^=\n]{0,20}[:=][^\n]+/i,
  PASSWORD_PATTERN: /(passphrase|pwd)[^=\n]{0,20}[:=][^\n]+/i,
  JWT_PATTERN: /[\w-]{24,}\.[\w-]{6,}\.[\w-]{27,}/g,
  GIT_PATTERN: /\bhttps?:\/\/[^\s'"`]+\.git(\b|\/)|['"]GIT_COMMIT['"]/i,
  DOMAIN_PATTERN: /https?:\/\/([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})(?=[\s/'"`]|$)/gi,
  QUIET_DOMAIN_KEYWORDS: ['key', 'auth', 'token', 'secret'],
};

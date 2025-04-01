const path = require('path');

/**
 * Extract the sourceMappingURL comment from a JavaScript file body.
 * Supports both //# and //@ forms.
 *
 * @param {string} jsUrl - The base JS URL (used to resolve relative maps)
 * @param {string} body - The JS file contents
 * @returns {string|null} - The resolved .map URL, or null if not found
 */
function extractSourceMapUrl(jsUrl, body) {
  const regex = /\/\/[#@]\s*sourceMappingURL=([^\s]+)/;
  const match = body.match(regex);
  if (!match) return null;

  try {
    const relative = match[1].trim();
    const resolved = new URL(relative, jsUrl).href;
    return resolved;
  } catch {
    return null;
  }
}

/**
 * Generate common guesses for a .map file based on a JS URL.
 *
 * @param {string} jsUrl - The URL of the JavaScript file
 * @returns {string[]} - A list of likely .map file URLs to try
 */
function guessMapUrls(jsUrl) {
  const base = jsUrl.replace(/[?#].*$/, '');
  const guesses = [];

  if (!base.endsWith('.js')) {
    return guesses;
  }

  guesses.push(`${base}.map`);
  guesses.push(base.replace(/\\.js$/, '.js.map'));
  guesses.push(base.replace(/(\\.min)?\\.js$/, '.min.js.map'));
  guesses.push(base.replace(/\\.bundle\\.js$/, '.bundle.js.map'));

  return [...new Set(guesses)];
}

module.exports = {
  extractSourceMapUrl,
  guessMapUrls,
};

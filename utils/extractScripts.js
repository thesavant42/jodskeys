// File: utils/extractScripts.js

const cheerio = require('cheerio');

/**
 * Extracts script source URLs from HTML content.
 * @param {string} html - The HTML content.
 * @param {string} baseUrl - The base URL to resolve relative script URLs.
 * @returns {string[]} Array of script URLs.
 */
function extractScriptsFromHTML(html, baseUrl) {
  const $ = cheerio.load(html);
  const scripts = [];

  $('script[src]').each((i, el) => {
    const src = $(el).attr('src');
    if (src && !src.startsWith('data:')) {
      const scriptUrl = new URL(src, baseUrl).toString();
      scripts.push(scriptUrl);
    }
  });

  return scripts;
}

module.exports = { extractScriptsFromHTML };
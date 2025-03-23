/**
 * Extracts the sourceMappingURL from a JavaScript file's contents.
 * Supports both single-line (//) and multi-line (/* * /) comments.
 *
 * @param {string} contents - The raw JavaScript file content.
 * @returns {string|null} The extracted mapping URL or null if none found.
 */
module.exports = function extractSourceMapURL(contents) {
    if (typeof contents !== 'string') return null;

    const regex = /(?:\/\/[@#]|\/\*[@#])\s*sourceMappingURL\s*=\s*(.+?)(?:\s*\*\/)?\s*$/im;
    const match = contents.match(regex);

    if (match && match[1]) {
        return match[1].trim();
    }

    return null;
};
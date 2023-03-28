const sanitizer = require('sanitize-html');

/**
 * A utility for working with content.
 */
class Content {
    /**
     * Rigidly clears the string from all tags and scripts.
     * If necessary, you can specify allowed tags and attributes.
     * @param {string} string The original string.
     * @param {string[]} [allowedTags] Allowed tags.
     * @param {object} [allowedAttributes]
     * Allowed attributes in the form of an object where
     * the key of the object as the tag name, the value is an array of allowed attributes.
     * @return {string} The cleared string.
     */
    sanitize(string, allowedTags = [], allowedAttributes = {}) {
        if (!string) {
            return '';
        }

        return sanitizer(string, { allowedTags, allowedAttributes });
    }
}

module.exports = Content;

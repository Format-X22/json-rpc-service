import * as sanitizer from 'sanitize-html';

/**
 * A utility for working with content.
 */
export class Content {
    /**
     * Rigidly clears the string from all tags and scripts.
     * If necessary, you can specify allowed tags and attributes.
     * @param string The original string.
     * @param [allowedTags] Allowed tags.
     * @param [allowedAttributes]
     * Allowed attributes in the form of an object where
     * the key of the object as the tag name, the value is an array of allowed attributes.
     * @return The cleared string.
     */
    sanitize(
        string: string,
        allowedTags: Array<string> = [],
        allowedAttributes: Record<string, Array<string>> = {}
    ): string {
        if (!string) {
            return '';
        }

        return sanitizer(string, { allowedTags, allowedAttributes });
    }
}

const template = require('lodash.template');

/**
 * Class of working with templates.
 * Uses Lodash.template to generate templates.
 */
class Template {
    /**
     * Creates a template object from a string.
     * The result can be called again by passing parameters
     * for substitution. You can see details in the
     * Lodash documentation for the template method.
     * @param {string} string String-template.
     * @returns {Function} The template is a function.
     */
    static make(string) {
        return template(string);
    }

    /**
     * Analogous to the make method, but creates templates for
     * rows inside an object, traversing it recursively,
     * replacing the original strings with function templates.
     * It is assumed that nested objects are objects
     * or support Object.keys(inner).
     * @param {Object} object Target object.
     * @returns {Object} object Target object.
     */
    static makeFor(object) {
        for (let key of Object.keys(object)) {
            if (typeof object[key] === 'string') {
                object[key] = this.make(object[key]);
            } else {
                this.makeFor(object[key]);
            }
        }

        return object;
    }
}

module.exports = Template;

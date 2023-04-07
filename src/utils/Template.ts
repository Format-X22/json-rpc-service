import * as template from 'lodash.template';

/**
 * Class of working with templates.
 * Uses Lodash.template to generate templates.
 */
export class Template {
    /**
     * Creates a template object from a string.
     * The result can be called again by passing parameters
     * for substitution. You can see details in the
     * Lodash documentation for the template method.
     * @param string String-template.
     * @returns The template is a function.
     */
    static make(string: string): Function {
        return template(string);
    }

    /**
     * Analogous to the make method, but creates templates for
     * rows inside an object, traversing it recursively,
     * replacing the original strings with function templates.
     * It is assumed that nested objects are objects
     * or support Object.keys(inner).
     * @param object Target object.
     * @returns object Target object.
     */
    static makeFor(object: Record<string, any>): Record<string, any> {
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

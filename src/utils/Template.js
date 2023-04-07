"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Template = void 0;
const template = require("lodash.template");
class Template {
    static make(string) {
        return template(string);
    }
    static makeFor(object) {
        for (let key of Object.keys(object)) {
            if (typeof object[key] === 'string') {
                object[key] = this.make(object[key]);
            }
            else {
                this.makeFor(object[key]);
            }
        }
        return object;
    }
}
exports.Template = Template;
//# sourceMappingURL=Template.js.map
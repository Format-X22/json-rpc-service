"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Content = void 0;
const sanitizer = require("sanitize-html");
class Content {
    sanitize(string, allowedTags = [], allowedAttributes = {}) {
        if (!string) {
            return '';
        }
        return sanitizer(string, { allowedTags, allowedAttributes });
    }
}
exports.Content = Content;
//# sourceMappingURL=Content.js.map
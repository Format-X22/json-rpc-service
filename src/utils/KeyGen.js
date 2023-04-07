"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.KeyGen = void 0;
class KeyGen {
    static makeBase28HumanReadableIdByMongoObjectId(mongoObjectId) {
        mongoObjectId = String(mongoObjectId);
        const int = parseInt(mongoObjectId.slice(-10), 16);
        const raw = int.toString(28).toUpperCase();
        return raw.replace(/0|O|I|L|C/g, char => {
            switch (char) {
                case '0':
                    return 'T';
                case 'O':
                    return 'V';
                case 'I':
                    return 'W';
                case 'L':
                    return 'X';
                case 'C':
                    return 'Z';
                default:
                    return char;
            }
        });
    }
}
exports.KeyGen = KeyGen;
//# sourceMappingURL=KeyGen.js.map
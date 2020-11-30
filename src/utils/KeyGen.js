class KeyGen {
    // Custom Base28 = A-Z + 0-9 - [0, O, I, L, C, S, Y, U]
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

module.exports = KeyGen;

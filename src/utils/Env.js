const fs = require('fs');
const path = require('path');

/**
 * A set of different methods for working with .ini file and environment variables.
 */
class Env {
    /**
     * Extract environment variables from a file.
     * @param [envPath] Not the standard path to the file.
     * @return {Map<string, string>} A set of environment variables.
     */
    static extractFromFile(envPath = path.resolve(process.cwd(), '.env')) {
        const rawEnvs = fs.readFileSync(envPath, { encoding: 'utf-8' });

        return new Map(rawEnvs.split('\n').map(i => i.split('=')));
    }
}

module.exports = Env;

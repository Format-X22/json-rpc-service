const fs = require('fs');
const path = require('path');

/**
 * A set of different methods for working with .ini file and environment variables.
 */
export class Env {
    /**
     * Extract environment variables from a file.
     * @param [envPath] Not the standard path to the file.
     * @return A set of environment variables.
     */
    static extractFromFile(
        envPath: string = path.resolve(process.cwd(), '.env')
    ): Map<string, string> {
        const rawEnvs = fs.readFileSync(envPath, { encoding: 'utf-8' });

        return new Map(rawEnvs.split('\n').map(i => i.split('=')));
    }
}

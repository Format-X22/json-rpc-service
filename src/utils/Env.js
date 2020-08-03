const fs = require('fs');
const path = require('path');

/**
 * Набор различных методов для работы с .env-файлом и переменными окружения.
 */
class Env {
    /**
     * Извлечь переменные окружения из файла.
     * @param [envPath] Не стандартный путь до файла.
     * @return {Map<string, string>} Набор переменных окружения.
     */
    static extractFromFile(envPath = path.resolve(process.cwd(), '.env')) {
        const rawEnvs = fs.readFileSync(envPath, { encoding: 'utf-8' });

        return new Map(rawEnvs.split('\n').map(i => i.split('=')));
    }
}

module.exports = Env;

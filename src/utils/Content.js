const sanitizer = require('sanitize-html');

/**
 * Утилита работы с контентом.
 */
class Content {

    /**
     * Жестко очищает строку от всех тегов и скриптов.
     * При необходимости можно указать разрешенные теги и атрибуты.
     * @param {string} string Изначальная строка.
     * @param {string[]} [allowedTags] Разрешенные теги.
     * @param {object} [allowedAttributes]
     * Разрешенные атрибуты в виде объекта где
     * ключ объекта как имя тега, значение - массив рзрешенных атрибутов.
     * @return {string} Очищенная строка.
     */
    sanitize(string, allowedTags = [], allowedAttributes = {}) {
        if (!string) {
            return '';
        }

        return sanitizer(string, { allowedTags, allowedAttributes });
    }
}

module.exports = Content;

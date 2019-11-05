# JSON-RPC-SERVICE

**JSON-RPC-SERVICE** является микро-фреймворком для создания сервисов с JSON-RPC API.
Сервисы могут обмениваться друг с другом сообщениями, играя роль микро-сервисов.

Используется в таких блокчейн проектах как:

-   Golos http://golos.io
-   CyberWay http://cyberway.io
-   BankEx http://bankex.com

---

**Основные возможности:**

-   Простое построение JSON-RPC API с валидацией параметров библиотекой `Ajv`.
-   Простое создание моделей для базы данных на основе `Mongoose` (MongoDB).
-   Базовые классы для контроллеров и сервисов.
-   `Prometheus` мониторинг.
-   Набор разнообразных утилит.

---

**Использование:**

Просто подключить нужный класс или сразу все классы через `index.js`

Также можно указать переменные окружения:

-   `JRS_CONNECTOR_HOST` - адрес, который будет использован для входящих подключений.  
    Дефолтное значение - `0.0.0.0`

-   `JRS_CONNECTOR_PORT` - адрес порта, который будет использован для входящих подключений.  
    Дефолтное значение - `3000`

-   `JRS_CONNECTOR_SOCKET` - адрес сокета, который будет использован для входящих подключений.  
    Если указан - заменяет подключение через хост/порт.

-   `JRS_METRICS_HOST` - адрес хоста для метрик Prometheus.  
    Дефолтное значение - `127.0.0.1`

-   `JRS_METRICS_PORT` - адрес порта для метрик Prometheus.  
    Дефолтное значение - `9777`

-   `JRS_MONGO_CONNECT` - строка подключения к базе MongoDB.  
    Дефолтное значение - `mongodb://mongo/admin`

-   `JRS_SYSTEM_METRICS` - включает логирование системных показателей системы для Prometheus.  
    Дефолтное значение - `false`

-   `JRS_EXTERNAL_CALLS_METRICS` - включает метрики не только по входящим, но и по исходящим запросами сервиса.  
    Дефолтное значение - `false`

-   `JRS_SERVER_STATIC_DIR` - в случае использования веб сервера можно указать папку для раздачи статичных файлов.  
    Дефолтное значение - `null` _(папка отсутствует)_

-   `JRS_SERVER_CONNECTOR_PATH` - в случае использования веб сервера можно указать путь по которому будет доступен коннектор.  
    Дефолтное значение - `/` _(корневой запрос)_

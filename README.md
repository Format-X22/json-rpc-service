# JSON-RPC-SERVICE

**JSON-RPC-SERVICE** is a micro-framework for creating services with the JSON-RPC API.
Services can exchange messages with each other, playing the role of microservices.

It is used in such blockchain projects as:

-   Golos http://golos.io
-   CyberWay http://cyberway.io
-   BankEx http://bankex.com
-   TNC Group https://tncitgroup.com

And not in blockchain projects:

-   TROOVE http://troove.ru

---

**Main features:**

-   Simple construction of the JSON-RPC API with parameter validation by the `Ajv` library.
-   Easy creation of models for a database based on `Mongoose` (MongoDB).
-   Base classes for controllers and services.
-   `Prometheus' monitoring.
-   A set of various utilities.

---

**Usage:**

Just connect the desired class or all classes at once via `index.ts `

You can also specify environment variables:

-   `JRS_CONNECTOR_HOST` - the address that will be used for incoming connections.  
    Default value - `0.0.0.0`

-   `JRS_CONNECTOR_PORT` - the address of the port that will be used for incoming connections.  
    Default value- `3000`

-   `JRS_CONNECTOR_SOCKET` - the address of the socket that will be used for incoming connections.  
    If specified, it replaces the connection via the host/port.

-   `JRS_METRICS_HOST` - the host address for Prometheus metrics. 
    Default value - `127.0.0.1`

-   `JRS_METRICS_PORT` - port address for Prometheus metrics.
    Default value - `9777`

-   `JRS_MONGO_CONNECT` - connection string to the MongoDB database.
    Default value - `mongodb://mongo/admin`

-   `JRS_SYSTEM_METRICS` - enables logging of system metrics for Prometheus.  
    Default value - `false`

-   `JRS_EXTERNAL_CALLS_METRICS` - includes metrics not only for incoming, but also for outgoing service requests.  
    Default value - `false`

-   `JRS_METRICS_TO_LOG` - duplicates all metrics in logs.  
    Default value - `false`

-   `JRS_SERVER_STATIC_DIR` - if you use a web server, you can specify a folder for distributing static files.  
    Default value - `null` _(folder is missing)_

-   `JRS_SERVER_CONNECTOR_PATH` - in the case of using a web server, you can specify the path by which the connector will be available.  
    Default value - `/` _(root query)_

-   `JRS_SERVER_BODY_SIZE_LIMIT` - the maximum size of the request body for the web server.  
    Default value - `20mb`

-   `JRS_CONNECTOR_ALIAS_NAME` - alias is the name of the microservice by which it is presented to other microservices,
    for example, with an internal ping request 
    Default value - `anonymous`

-   `JRS_POSTGRES_USERNAME` - the username when connecting to the Postgres database.

-   `JRS_POSTGRES_PASSWORD` - password when connecting to the Postgres database.

-   `JRS_POSTGRES_HOST` - host when connecting to the Postgres database.

-   `JRS_POSTGRES_PORT` - port when connecting to the Postgres database.

-   `JRS_POSTGRES_DATABASE` - the name of the database when connecting to the Postgres database.

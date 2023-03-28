const Logger = require('../utils/Logger');

/**
 * A function that performs the default launch of a microservice,
 * it is enough just to pass the main class of the application.
 * Exists because of the complete analogy of the launch method
 * all current core-based microservices.
 * @param {Basic} Main The main class of the application.
 */
module.exports = Main => {
    new Main().start().then(
        () => {
            Logger.info('Main service started!');
        },
        error => {
            Logger.error('Main service failed:', error);
            process.exit(1);
        }
    );
};

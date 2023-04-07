import { Basic } from '../services/Basic';

const Logger = require('../utils/Logger');

/**
 * A function that performs the default launch of a microservice,
 * it is enough just to pass the main class of the application.
 * Exists because of the complete analogy of the launch method
 * all current core-based microservices.
 * @param Main The main class of the application.
 */
export default (Main: typeof Basic | any) => {
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

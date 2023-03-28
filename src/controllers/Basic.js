const Logger = require('../utils/Logger');

/**
 * Base class for controllers.
 * Provides common logic for application controllers.
 * Supports the basic interface of controllers.
 * The constructor can optionally accept a connector,
 * which allows you to use the sendTo shot-cut method,
 * proxying the call through itself, which allows you to communicate
 * with other microservices.
 */
class Basic {
    /**
     * Constructor
     * @param {Object} [options] Controller settings.
     * @param {Object} [options.connector] An arbitrary instance of the connector class,
     * it is assumed that this is a Connector for communication between microservices,
     * but it can be any other class that implements a similar interface.
     */
    constructor({ connector } = {}) {
        if (connector) {
            this.connector = connector;
        }
    }

    /**
     * @property {Object} connector is created by the constructor, see the description.
     */

    /**
     * The base method of any controller, which is the default input point.
     * @returns {Promise<void>}
     */
    async handle() {
        throw 'Not implemented';
    }

    /**
     * Shotcat method for working with the connector, in the basic view
     * sends a message to another microservice, but in essence
     * simply calls a similar method from the connector from the constructor,
     * if available.
     * @param args Arbitrary arguments.
     * @returns {Promise<*>} Answer.
     */
    async sendTo(...args) {
        if (this.connector) {
            return await this.connector.sendTo(...args);
        } else {
            Logger.error('Basic controller - connector not defined');
            console.trace();
            throw 'Connector not defined';
        }
    }

    /**
     * Shotcat method for working with the connector, in the basic view
     * sends a message to another microservice, but in essence
     * just calls a similar method from the connector.
     * @param {string} service Name is the alias of the microservice.
     * @param {string} method JSON-RPC method.
     * @param {Object} params Request parameters.
     * @returns {Promise<*>} Answer.
     */
    async callService(service, method, params) {
        if (this.connector) {
            return await this.connector.callService(service, method, params);
        } else {
            Logger.error('Basic controller - connector not defined');
            console.trace();
            throw 'Connector not defined';
        }
    }
}

module.exports = Basic;

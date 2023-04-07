import { Logger } from '../utils/Logger';

/**
 * Base class for controllers.
 * Provides common logic for application controllers.
 * Supports the basic interface of controllers.
 * The constructor can optionally accept a connector,
 * which allows you to use the sendTo shot-cut method,
 * proxying the call through itself, which allows you to communicate
 * with other microservices.
 */
export abstract class Basic {
    private readonly connector: any;

    /**
     * Constructor
     * @param {Object} [options] Controller settings.
     * @param {Object} [options.connector] An arbitrary instance of the connector class,
     * it is assumed that this is a Connector for communication between microservices,
     * but it can be any other class that implements a similar interface.
     */
    protected constructor({ connector }: { connector?: any } = {}) {
        if (connector) {
            this.connector = connector;
        }
    }

    /**
     * The base method of any controller, which is the default input point.
     */
    abstract handle(): Promise<never>;

    /**
     * Shotcat method for working with the connector, in the basic view
     * sends a message to another microservice, but in essence
     * simply calls a similar method from the connector from the constructor,
     * if available.
     * @param args Arbitrary arguments.
     */
    async sendTo(...args: Array<any>): Promise<any> {
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
     * @param service Name is the alias of the microservice.
     * @param method JSON-RPC method.
     * @param params Request parameters.
     */
    async callService(service: string, method: string, params: Record<string, any>): Promise<any> {
        if (this.connector) {
            return await this.connector.callService(service, method, params);
        } else {
            Logger.error('Basic controller - connector not defined');
            console.trace();
            throw 'Connector not defined';
        }
    }
}

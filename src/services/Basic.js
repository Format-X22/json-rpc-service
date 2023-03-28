const EventEmitter = require('events');
const Logger = require('../utils/Logger');
const env = require('../data/env');

/**
 * Basic service acting as an abstract service with a part already
 * implemented methods. It is supposed to be used only through
 * inheritance.
 *
 * Contains a startup method that directly starts the service, separately
 * from the designer. One of the reasons for this separation is that the service can
 * run infinite loops executed at the right time intervals.
 * Accordingly contains a stop method that cleans up everything behind it
 * what is necessary, stops cycles, being a kind of destructor, safely
 * completing the service. Additionally, a method for restoring the service is provided,
 * which restores the state after a failure, recreating what is needed or
 * destroying what is not valid. A method of retry execution is also provided
 * actions. For services that are finite and can be terminated
 * explicitly - there is a one-way mechanism for setting the state of the service in
 * the completed state, as well as the method of checking it.
 *
 * For the organization of infinite or conditionally finite cycles is provided
 * the iteration execution mechanism that calls the corresponding method
 * each specified period of time, with the possibility to redefine
 * the start time of the first iteration because there is a need to run it through
 * a completely different time or immediately. There is also a stop method
 * iterator.
 *
 * Services may contain nested services that are stored in a
 * specialized collection. There are also methods to run
 * and stops of nested services, which in turn may contain
 * its own nested services, which allows you to organize
 * a tree-like architecture of dependent services and automatically enable and
 * turn off the necessary branches. At the same time, this process can be asynchronous.
 *
 * Nested services are stopped in reverse order relative to startup.
 *
 * Additionally, the installation of the service in the auto-shutdown mode
 * is provided * when the process is completed by the SIGINT signal (Ctrl-C and so on).
 *
 * Each service is equipped with an event emitter, which is an instance
 * of the * standard EventEmitter from NodeJS. For convenience, there are methods-shotcats
 * emit and on, for other actions with events, you must directly use the
 * intsance received by getEmitter(). It is also possible to broadcast events
 * from other objects through yourself.
 *
 * For convenience, it is possible to specify
 * asynchronous startup logic in the boot method.
 */
class Basic {
    /**
     * * Allow parallel running of iterations.
     * @type {boolean} Permission.
     */
    allowParallelIterations = true;

    /**
     * Whether to throw the error in the iteration further.
     * @type {boolean} Permission.
     */
    throwOnIterationError = true;

    #exclusiveIterationInProcess = false;

    constructor() {
        this._nestedServices = [];
        this._done = false;

        this._emitter = new EventEmitter();
    }

    /**
     * Checking the service for completeness.
     * @returns {boolean} The result of the check.
     */
    isDone() {
        return this._done;
    }

    /**
     * Marking the service as completed.
     */
    done() {
        this._done = true;
    }

    /**
     * Start of the service.
     * @param {...*} [args] Arguments.
     * @returns {Promise<void>} Promise without extra data.
     */
    async start(...args) {
        await this.startNested();
    }

    /**
     * Stopping the service.
     * @param {...*} [args] Arguments.
     * @returns {Promise<void>} Promise without extra data.
     */
    async stop(...args) {
        await this.stopNested();
    }

    /**
     * Abstract method of restoring the service, does not require the need
     * in implementation.
     * @param {...*} [args] Arguments.
     * @returns {Promise<void>} Promise without extra data.
     */
    async restore(...args) {
        // Do nothing
    }

    /**
     * Abstract method of re-attempting an action.
     * @param {...*} [args] Arguments.
     * @returns {Promise<void>} Promise without extra data.
     */
    async retry(...args) {
        // Do nothing
    }

    /**
     * Abstract asynchronous method that is supposed to run
     * when starting the service to perform any asynchronous logic,
     * which cannot be placed in the constructor.
     * @returns {Promise<void>} Promise without extra data.
     */
    async boot() {
        // abstract
    }

    /**
     * Adds services as a dependency to this service.
     * @param {Basic} services Services.
     */
    addNested(...services) {
        this._nestedServices.push(...services);
    }

    /**
     * Starts all dependent services.
     * @returns {Promise<void>} Promise without extra data.
     */
    async startNested() {
        Logger.info('Start services...');

        for (let service of this._nestedServices) {
            Logger.info(`Start ${service.constructor.name}...`);
            await service.start();
            Logger.info(`The ${service.constructor.name} done!`);
        }

        Logger.info('Start services done!');
    }

    /**
     * Stops all dependent services.
     * @returns {Promise<void>} Promise without extra data.
     */
    async stopNested() {
        Logger.info('Cleanup...');

        for (let service of this._nestedServices.reverse()) {
            Logger.info(`Stop ${service.constructor.name}...`);

            if (!service.isDone()) {
                await service.stop();
            }

            Logger.info(`The ${service.constructor.name} done!`);
        }

        Logger.info('Cleanup done!');
    }

    /**
     * Sets the handler to the SIGINT signal (Ctrl-C, etc.),
     * which calls the stop method.
     */
    stopOnExit() {
        process.on('SIGINT', this.stop.bind(this));
    }

    /**
     * Terminates the process with an error if an unprocessed
     * correction/promise errors.
     */
    throwOnUnhandledPromiseRejection() {
        process.on('unhandledRejection', error => {
            Logger.error('Unhandled promise rejection:', error);
            process.exit(1);
        });
    }

    /**
     * Iteration of the service if the service is cyclic.
     * @param {...*} [args] Arguments.
     * @returns {Promise<void>} Promise without extra data.
     */
    async iteration(...args) {
        throw 'Empty iteration body';
    }

    /**
     * Starts the service iterator.
     * @param {number} [firstIterationTimeout] Postponing the launch of the first iteration.
     * @param {number} [interval] The interval between iteration runs.
     */
    startLoop(firstIterationTimeout = 0, interval = Infinity) {
        setTimeout(async () => {
            await this._runIteration();

            this._loopId = setInterval(async () => {
                await this._runIteration();
            }, interval);
        }, firstIterationTimeout);
    }

    /**
     * Stops the iterator, while if some iteration is
     * in progress - it will continue execution, but new iterations
     * will not be started.
     */
    stopLoop() {
        clearInterval(this._loopId);
    }

    /**
     * Prints the microservice configuration installed via
     * ENV variables. The configuration of the root classes will be printed out
     * automatically, to print out the configuration of the microservice itself
     * it is necessary to pass the env module object to the method parameters.
     * @param {Object} [serviceEnv] Microservice level configuration module.
     */
    printEnvBasedConfig(serviceEnv = {}) {
        Logger.info('ENV-based config:');
        Logger.info('Core config params:');
        Logger.info('---');

        for (let key of Object.keys(env)) {
            Logger.info(`${key} = ${env[key]}`);
        }

        Logger.info('---');
        Logger.info('Service config params:');
        Logger.info('---');

        for (let key of Object.keys(serviceEnv)) {
            Logger.info(`${key} = ${serviceEnv[key]}`);
        }

        Logger.info('---');
    }

    /**
     * Service event emitter, required to subscribe to events.
     * The returned emitter instrance is standard
     * NodeJS emitter.
     * @returns {EventEmitter} Service event emitter.
     */
    getEmitter() {
        return this._emitter;
    }

    /**
     * A shortcut to launch the event.
     * Launches an event with the specified name.
     * Data, if necessary, can be transmitted in fragments
     * separated by commas.
     * @param {string/Symbol} name The name of the event.
     * @param {...*} [data] Data.
     */
    emit(name, ...data) {
        this._emitter.emit(name, ...data);
    }

    /**
     * Broadcasting the events of the target object through itself.
     * @param {Object/Object[]} from The emitter whose events need to be broadcast.
     * @param {...string/string/string[]} events List of events.
     */
    translateEmit(from, ...events) {
        if (!Array.isArray(from)) {
            from = [from];
        }

        if (Array.isArray(events[0])) {
            events = events[0];
        }

        for (let target of from) {
            for (let event of events) {
                target.on(event, (...args) => this.emit(event, ...args));
            }
        }
    }

    /**
     * Subscribing to an event with the specified name.
     * @param {string/Symbol} name Event name.
     * @param {Function} callback Callback.
     */
    on(name, callback) {
        this._emitter.on(name, callback);
    }

    /**
     * Subscribing to an event with the specified name.
     * Executed once.
     * @param {string/Symbol} name Event name.
     * @param {Function} callback Callback.
     */
    once(name, callback) {
        this._emitter.once(name, callback);
    }

    async _runIteration() {
        if (this.allowParallelIterations) {
            await this._handleIteration();
            return;
        }

        if (this.#exclusiveIterationInProcess) {
            return;
        }

        this.#exclusiveIterationInProcess = true;

        try {
            await this._handleIteration();
        } finally {
            this.#exclusiveIterationInProcess = false;
        }
    }

    async _handleIteration() {
        if (this.throwOnIterationError) {
            await this.iteration();
            return;
        }

        try {
            await this.iteration();
        } catch (error) {
            Logger.error('Iteration fail - ', error);
        }
    }
}

module.exports = Basic;

import * as EventEmitter from 'node:events';
import { Logger } from '../utils/Logger';
import { envs } from '../data/env';

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
export abstract class Basic {
    private exclusiveIterationInProcess = false;
    private loopId: NodeJS.Timer;
    private doneFlag: boolean;
    private emitter: EventEmitter;

    protected nestedServices: Array<any>;

    /**
     * Allow parallel running of iterations.
     */
    public allowParallelIterations = true;

    /**
     * Whether to throw the error in the iteration further.
     */
    public throwOnIterationError = true;

    constructor() {
        this.nestedServices = [];
        this.doneFlag = false;

        this.emitter = new EventEmitter();
    }

    /**
     * Checking the service for completeness.
     * @returns {boolean} The result of the check.
     */
    isDone() {
        return this.doneFlag;
    }

    /**
     * Marking the service as completed.
     */
    done() {
        this.doneFlag = true;
    }

    /**
     * Start of the service.
     * @param [args] Arguments.
     */
    async start(...args: Array<any>): Promise<void> {
        await this.startNested();
    }

    /**
     * Stopping the service.
     * @param [args] Arguments.
     */
    async stop(...args: Array<any>): Promise<void> {
        await this.stopNested();
    }

    /**
     * Abstract method of restoring the service, does not require the need
     * in implementation.
     * @param [args] Arguments.
     */
    async restore(...args: Array<any>): Promise<void> {
        // Do nothing
    }

    /**
     * Abstract method of re-attempting an action.
     * @param [args] Arguments.
     */
    async retry(...args: Array<any>): Promise<void> {
        // Do nothing
    }

    /**
     * Abstract asynchronous method that is supposed to run
     * when starting the service to perform any asynchronous logic,
     * which cannot be placed in the constructor.
     */
    async boot(): Promise<void> {
        // Do nothing
    }

    /**
     * Adds services as a dependency to this service.
     * @param services Services.
     */
    addNested(...services: Array<Basic>) {
        this.nestedServices.push(...services);
    }

    /**
     * Starts all dependent services.
     */
    async startNested(): Promise<void> {
        Logger.info('Start services...');

        for (let service of this.nestedServices) {
            Logger.info(`Start ${service.constructor.name}...`);
            await service.start();
            Logger.info(`The ${service.constructor.name} done!`);
        }

        Logger.info('Start services done!');
    }

    /**
     * Stops all dependent services.
     */
    async stopNested(): Promise<void> {
        Logger.info('Cleanup...');

        for (let service of this.nestedServices.reverse()) {
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
    stopOnExit(): void {
        process.on('SIGINT', this.stop.bind(this));
    }

    /**
     * Terminates the process with an error if an unprocessed
     * correction/promise errors.
     */
    throwOnUnhandledPromiseRejection(): void {
        process.on('unhandledRejection', error => {
            Logger.error('Unhandled promise rejection:', error);
            process.exit(1);
        });
    }

    /**
     * Iteration of the service if the service is cyclic.
     * @param [args] Arguments.
     */
    async iteration(...args: Array<any>): Promise<void> {
        throw 'Empty iteration body';
    }

    /**
     * Starts the service iterator.
     * @param [firstIterationTimeout] Postponing the launch of the first iteration.
     * @param [interval] The interval between iteration runs.
     */
    startLoop(firstIterationTimeout = 0, interval = Infinity): void {
        setTimeout(async () => {
            await this.runIteration();

            this.loopId = setInterval(async () => {
                await this.runIteration();
            }, interval);
        }, firstIterationTimeout);
    }

    /**
     * Stops the iterator, while if some iteration is
     * in progress - it will continue execution, but new iterations
     * will not be started.
     */
    stopLoop(): void {
        clearInterval(this.loopId);
    }

    /**
     * Prints the microservice configuration installed via
     * ENV variables. The configuration of the root classes will be printed out
     * automatically, to print out the configuration of the microservice itself
     * it is necessary to pass the env module object to the method parameters.
     * @param [serviceEnv] Microservice level configuration module.
     */
    printEnvBasedConfig(serviceEnv: Record<string, any> = {}) {
        Logger.info('ENV-based config:');
        Logger.info('Core config params:');
        Logger.info('---');

        for (let key of Object.keys(envs)) {
            Logger.info(`${key} = ${envs[key]}`);
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
     * @returns Service event emitter.
     */
    getEmitter(): EventEmitter {
        return this.emitter;
    }

    /**
     * A shortcut to launch the event.
     * Launches an event with the specified name.
     * Data, if necessary, can be transmitted in fragments
     * separated by commas.
     * @param name The name of the event.
     * @param [data] Data.
     */
    emit(name: string | symbol, ...data: Array<any>) {
        this.emitter.emit(name, ...data);
    }

    /**
     * Broadcasting the events of the target object through itself.
     * @param from The emitter whose events need to be broadcast.
     * @param events List of events.
     */
    translateEmit(
        from: Record<string, any> | Array<Record<string, any>>,
        ...events: Array<string>
    ) {
        if (!Array.isArray(from)) {
            from = [from];
        }

        const normalizedFrom = from as Array<Record<string, any>>;

        for (let target of normalizedFrom) {
            for (let event of events) {
                target.on(event, (...args) => this.emit(event, ...args));
            }
        }
    }

    /**
     * Subscribing to an event with the specified name.
     * @param name Event name.
     * @param callback Callback.
     */
    on(name: string | symbol, callback: (...args: Array<any>) => void): void {
        this.emitter.on(name, callback);
    }

    /**
     * Subscribing to an event with the specified name.
     * Executed once.
     * @param name Event name.
     * @param callback Callback.
     */
    once(name: string | symbol, callback: (...args: Array<any>) => void): void {
        this.emitter.once(name, callback);
    }

    private async runIteration() {
        if (this.allowParallelIterations) {
            await this.handleIteration();
            return;
        }

        if (this.exclusiveIterationInProcess) {
            return;
        }

        this.exclusiveIterationInProcess = true;

        try {
            await this.handleIteration();
        } finally {
            this.exclusiveIterationInProcess = false;
        }
    }

    private async handleIteration() {
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

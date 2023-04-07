/**
 * An assistant for asynchronous calls with a limitation of simultaneous calls.
 */
export class ParallelPool {
    private handler: Function;
    private parallelCount: number;
    private isChecking: boolean;
    private queueVal: Array<any>;
    private currentPromises: Set<any>;

    /**
     * Creates a queue of parallel calls with a limit on the number of simultaneous processing.
     * @param handler - queue handler
     * @param parallelCount - number of parallel handlers
     */
    constructor({
        handler,
        parallelCount = 10,
    }: { handler?: Function; parallelCount?: number } = {}) {
        if (!handler) {
            throw new Error('Need pass handler');
        }

        this.handler = handler;
        this.parallelCount = parallelCount;

        this.isChecking = false;
        this.queueVal = [];
        this.currentPromises = new Set();
    }

    /**
     * Add a call to the execution queue,
     * returns the resulting value from the handler wrapped in Promise
     */
    queue(...args: Array<any>): Promise<any> {
        const itemInfo = {
            args,
            promise: null,
            resolve: null,
            reject: null,
        };

        itemInfo.promise = new Promise((resolve, reject) => {
            itemInfo.resolve = resolve;
            itemInfo.reject = reject;
        });

        this.queueVal.push(itemInfo);
        this.checkQueue();

        return itemInfo.promise;
    }

    /**
     * Add handler calls to the execution queue,
     * returns an array of resulting values wrapped in Promise.
     */
    queueList(list: Array<any>): Promise<Array<any>> {
        return Promise.all(list.map(arg => this.queue(arg)));
    }

    /**
     * Get the length of the execution queue, including
     * those functions that have already been started, but have not yet been completed
     * @return Number of functions.
     */
    getQueueLength(): number {
        return this.currentPromises.size + this.queue.length;
    }

    /**
     * Wait for all calls (current and queued) to finish
     */
    async flush() {
        await Promise.all(
            // @ts-ignore
            [...this.currentPromises, ...this.queueVal.map(info => info.promise)].map(
                promise => promise.catch(noop) // flush
            )
        );
    }

    private checkQueue(): void {
        if (this.queueVal.length === 0 || this.isChecking) {
            return;
        }

        this.isChecking = true;

        while (this.queueVal.length && this.currentPromises.size < this.parallelCount) {
            // this.runNext must calling without await
            this.runNext();
        }

        this.isChecking = false;
    }

    private async runNext() {
        const { args, promise, resolve, reject } = this.queueVal.shift();

        this.currentPromises.add(promise);

        try {
            resolve(await this.handler(...args));
        } catch (err) {
            reject(err);
        }

        this.currentPromises.delete(promise);

        this.checkQueue();
    }
}

function noop() {}

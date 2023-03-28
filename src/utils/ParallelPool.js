/**
 * An assistant for asynchronous calls with a limitation of simultaneous calls.
 */
class ParallelPool {
    /**
     * Creates a queue of parallel calls with a limit on the number of simultaneous processing.
     * @param {function} handler - queue handler
     * @param {number} parallelCount - number of parallel handlers
     */
    constructor({ handler, parallelCount = 10 } = {}) {
        if (!handler) {
            throw new Error('Need pass handler');
        }

        this._handler = handler;
        this._parallelCount = parallelCount;

        this._isChechking = false;
        this._queue = [];
        this._currentPromises = new Set();
    }

    /**
     * Add a call to the execution queue,
     * returns the resulting value from the handler wrapped in Promise
     * @param args
     * @returns {Promise<*>}
     */
    queue(...args) {
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

        this._queue.push(itemInfo);
        this._checkQueue();

        return itemInfo.promise;
    }

    /**
     * Add handler calls to the execution queue,
     * returns an array of resulting values wrapped in Promise.
     * @param {Array} list
     * @returns {Promise<[]>}
     */
    queueList(list) {
        return Promise.all(list.map(arg => this.queue(arg)));
    }

    /**
     * Get the length of the execution queue, including
     * those functions that have already been started, but have not yet been completed
     * @return {number} Number of functions.
     */
    getQueueLength() {
        return this._currentPromises.size + this._queue.length;
    }

    /**
     * Wait for all calls (current and queued) to finish
     */
    async flush() {
        await Promise.all(
            [...this._currentPromises, ...this._queue.map(info => info.promise)].map(
                promise => promise.catch(noop) // flush игнорирует ошибки
            )
        );
    }

    _checkQueue() {
        if (this._queue.length === 0 || this._isChechking) {
            return;
        }

        this._isChechking = true;

        while (this._queue.length && this._currentPromises.size < this._parallelCount) {
            // this._runNext must calling without await
            this._runNext();
        }

        this._isChechking = false;
    }

    async _runNext() {
        const { args, promise, resolve, reject } = this._queue.shift();

        this._currentPromises.add(promise);

        try {
            resolve(await this._handler(...args));
        } catch (err) {
            reject(err);
        }

        this._currentPromises.delete(promise);

        this._checkQueue();
    }
}

function noop() {}

module.exports = ParallelPool;

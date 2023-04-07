"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ParallelPool = void 0;
class ParallelPool {
    constructor({ handler, parallelCount = 10, } = {}) {
        if (!handler) {
            throw new Error('Need pass handler');
        }
        this.handler = handler;
        this.parallelCount = parallelCount;
        this.isChecking = false;
        this.queueVal = [];
        this.currentPromises = new Set();
    }
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
        this.queueVal.push(itemInfo);
        this.checkQueue();
        return itemInfo.promise;
    }
    queueList(list) {
        return Promise.all(list.map(arg => this.queue(arg)));
    }
    getQueueLength() {
        return this.currentPromises.size + this.queue.length;
    }
    async flush() {
        await Promise.all([...this.currentPromises, ...this.queueVal.map(info => info.promise)].map(promise => promise.catch(noop)));
    }
    checkQueue() {
        if (this.queueVal.length === 0 || this.isChecking) {
            return;
        }
        this.isChecking = true;
        while (this.queueVal.length && this.currentPromises.size < this.parallelCount) {
            this.runNext();
        }
        this.isChecking = false;
    }
    async runNext() {
        const { args, promise, resolve, reject } = this.queueVal.shift();
        this.currentPromises.add(promise);
        try {
            resolve(await this.handler(...args));
        }
        catch (err) {
            reject(err);
        }
        this.currentPromises.delete(promise);
        this.checkQueue();
    }
}
exports.ParallelPool = ParallelPool;
function noop() { }
//# sourceMappingURL=ParallelPool.js.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Parallel = void 0;
const Logger = require('./Logger');
class Parallel {
    consequentially(callback) {
        const state = {
            queue: [],
            isCanceled: false,
            callback,
            handle: null,
        };
        state.handle = this.makeQueueHandler(state);
        const wrapperCallback = (...args) => {
            if (state.isCanceled) {
                throw new Error('Queue have been canceled');
            }
            state.queue.push(args);
            state.handle();
        };
        wrapperCallback.getQueueLength = () => {
            if (!state.queue) {
                return 0;
            }
            return state.queue.length;
        };
        wrapperCallback.cancel = () => {
            state.isCanceled = true;
            state.queue = null;
        };
        return wrapperCallback;
    }
    makeQueueHandler(state) {
        let isProcessing = false;
        return async () => {
            if (isProcessing) {
                return;
            }
            isProcessing = true;
            await this.handleQueue(state);
            isProcessing = false;
        };
    }
    async handleQueue(state) {
        let args;
        while ((args = state.queue.shift())) {
            try {
                await state.callback.apply(null, args);
            }
            catch (error) {
                Logger.error('Consequentially queue failed:', error);
                process.exit(1);
            }
        }
    }
}
exports.Parallel = Parallel;
//# sourceMappingURL=Parallel.js.map
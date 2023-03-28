const Logger = require('./Logger');

/**
 * Utility for working with asynchronous parallel computing.
 */
class Parallel {
    /**
     * Creates a call buffer based on the passed callback function.
     * The buffer can be called as a function any number of times, for each time
     * the callback function will be called asynchronously, but the next call
     * will wait for the completion of the previous ones, which guarantees
     * the sequence of execution of functions one after the other upon
     * completion of the previous one, regardless of the time of appearance
     * the next call or execution time of the callback function.
     * The buffer does not return the result of the callback function execution,
     * to obtain the results of calculations, it is necessary to process
     * they are in the callback function itself.
     * @param {Function} callback The callback function.
     * @return {Function} Call buffer.
     */
    consequentially(callback) {
        const state = {
            queue: [],
            isCanceled: false,
            callback,
        };

        state.handle = this._makeQueueHandler(state);

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

    _makeQueueHandler(state) {
        let isProcessing = false;

        return async () => {
            if (isProcessing) {
                return;
            }

            isProcessing = true;
            await this._handleQueue(state);
            isProcessing = false;
        };
    }

    async _handleQueue(state) {
        let args;

        while ((args = state.queue.shift())) {
            try {
                await state.callback.apply(null, args);
            } catch (error) {
                Logger.error('Consequentially queue failed:', error);
                process.exit(1);
            }
        }
    }
}

module.exports = Parallel;

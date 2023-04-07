const Logger = require('./Logger');

export type TState = {
    queue: Array<any>;
    isCanceled: boolean;
    callback: Function;
    handle: Function;
};

/**
 * Utility for working with asynchronous parallel computing.
 */
export class Parallel {
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
     * @param callback The callback function.
     * @return Call buffer.
     */
    consequentially(callback: Function): Function {
        const state: TState = {
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

    private makeQueueHandler(state: TState): Function {
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

    private async handleQueue(state: TState): Promise<void> {
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

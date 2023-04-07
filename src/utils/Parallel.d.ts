export type TState = {
    queue: Array<any>;
    isCanceled: boolean;
    callback: Function;
    handle: Function;
};
export declare class Parallel {
    consequentially(callback: Function): Function;
    private makeQueueHandler;
    private handleQueue;
}

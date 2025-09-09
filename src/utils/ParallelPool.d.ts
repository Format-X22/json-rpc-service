export declare class ParallelPool {
    private readonly handler;
    private readonly parallelCount;
    private isChecking;
    private queueVal;
    private currentPromises;
    constructor({ handler, parallelCount, }?: {
        handler?: Function;
        parallelCount?: number;
    });
    queue(...args: Array<any>): Promise<any>;
    queueList(list: Array<any>): Promise<Array<any>>;
    getQueueLength(): number;
    flush(): Promise<void>;
    private checkQueue;
    private runNext;
}

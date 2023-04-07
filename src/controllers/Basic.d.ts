export declare abstract class Basic {
    private readonly connector;
    protected constructor({ connector }?: {
        connector?: any;
    });
    abstract handle(): Promise<never>;
    sendTo(...args: Array<any>): Promise<any>;
    callService(service: string, method: string, params: Record<string, any>): Promise<any>;
}

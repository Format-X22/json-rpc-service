export declare class RpcObject {
    static success(result: Record<string, any>, id: number | string): any;
    static error(errorOrErrorCode: Record<string, any> | number | {
        code: number;
        message: string;
        messageText: string;
    }, messageText: any): any;
    static response(error: Record<string, any>, result?: Record<string, any>, id?: number | string): any;
    static request(method: string, data?: Record<string, any>, id?: number | string): any;
}

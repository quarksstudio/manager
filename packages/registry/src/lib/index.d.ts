export declare class Client {
    static API: string;
    static version: string;
    private token;
    Auth: {};
    Packages: {};
    constructor(token?: string);
    _fetch(url: string, options?: Record<string, any>): Promise<any>;
    _request(url: string, options?: Record<string, any>): Promise<Response>;
    _headers(): Record<string, string>;
}

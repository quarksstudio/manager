import type { HttpMock } from '../types';
export interface MockProxySession {
    url: string;
    caFile: string;
    stop(): Promise<string[]>;
}
/** A loopback-only HTTP/HTTPS proxy that can never forward traffic. */
export declare function startMockProxy(mocks: HttpMock[]): Promise<MockProxySession>;
export declare function runMockInterceptionCanary(): Promise<boolean>;

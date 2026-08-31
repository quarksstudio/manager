export interface Clock {
    now(): Date;
}
export declare const systemClock: Clock;
export declare class DomainError extends Error {
    readonly code: string;
    constructor(code: string, message: string);
}
export type Result<T, E extends Error = DomainError> = {
    ok: true;
    value: T;
} | {
    ok: false;
    error: E;
};

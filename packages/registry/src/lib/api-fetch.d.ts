export declare const AUTH_SESSION_KEY = "auth:session";
export interface AuthSession {
    accessToken: string;
    refreshToken?: string;
}
export interface ApiFetchOptions extends RequestInit {
    skipAuth?: boolean;
    force?: boolean;
    cacheTtlMs?: number;
    useCache?: boolean;
}
export declare function apiRequest(endpoint: string, options?: ApiFetchOptions): Promise<Response>;
export declare function apiFetch<T = unknown>(endpoint: string, options?: ApiFetchOptions): Promise<T>;

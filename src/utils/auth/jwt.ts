import { jwtDecode } from "jwt-decode";

export interface DecodedToken {
    exp: number;
    nbf?: number;
    iat?: number;
    sub?: string;
    nameid?: string;
    email?: string;
    displayName?: string;
    role?: string;
    [key: string]: unknown;
}

export function decodeToken(token: string): DecodedToken {
    return jwtDecode<DecodedToken>(token);
}

export function getTokenExpiration(token: string) {
    const decoded = decodeToken(token);
    const expiresAt = decoded.exp * 1000;

    return {
        expiresAt,
        expiresInMs: expiresAt - Date.now(),
    };
}

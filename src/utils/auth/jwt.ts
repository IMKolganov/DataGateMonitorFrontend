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
    /** If backend adds profile URL to access JWT, it wins over localStorage. */
    avatarUrl?: string;
    /** Google sub, Telegram id, etc. (not the dashboard numeric user id). */
    externalId?: string;
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

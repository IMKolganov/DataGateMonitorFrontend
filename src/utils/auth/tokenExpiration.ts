// src/utils/auth/tokenExpiration.ts
import { jwtDecode } from "jwt-decode";

interface JwtPayload {
    exp: number;
}

export function getTokenRemainingMs(token: string): number {
    const decoded = jwtDecode<JwtPayload>(token);
    return decoded.exp * 1000 - Date.now();
}

export function formatRemainingTime(ms: number): string {
    if (ms <= 0) return "expired";

    const totalSeconds = Math.floor(ms / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;

    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

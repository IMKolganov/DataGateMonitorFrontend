import { decodeToken } from "./jwt";
import { SystemRoles } from "../../constants/systemRoles";
import {ACCESS_TOKEN_KEY} from "../const.ts";

const ROLE_CLAIM =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export interface CurrentUser {
    id: number;
    displayName?: string;
    email?: string;
    role?: string;
}

export function getCurrentUser(): CurrentUser | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;

    try {
        const decoded = decodeToken(token);

        return {
            id: Number(decoded.nameid ?? decoded.sub),
            displayName: decoded.displayName,
            email: decoded.email,
            role: decoded[ROLE_CLAIM] as string | undefined,
        };
    } catch {
        return null;
    }
}

export function isAdmin(user?: CurrentUser | null): boolean {
    return user?.role === SystemRoles.Admin;
}

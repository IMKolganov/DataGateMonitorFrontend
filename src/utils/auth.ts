import { jwtDecode } from "jwt-decode";
import {SystemRoles} from "../constants/systemRoles.ts";

export interface CurrentUser {
    id: number;
    displayName?: string;
    email?: string;
    role?: string;
}

const ROLE_CLAIM =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";

export function getCurrentUser(): CurrentUser | null {
    const token = localStorage.getItem("token");
    if (!token) return null;

    try {
        const decoded = jwtDecode<Record<string, unknown>>(token);

        return {
            id: Number(decoded["nameid"] ?? decoded["sub"]),
            displayName: decoded["displayName"] as string | undefined,
            email: decoded["email"] as string | undefined,
            role: decoded[ROLE_CLAIM] as string | undefined,
        };
    } catch {
        return null;
    }
}

export function isAdmin(user?: CurrentUser | null): boolean {
    return user?.role === SystemRoles.Admin;
}
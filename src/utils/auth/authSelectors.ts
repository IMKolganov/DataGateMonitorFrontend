import { decodeToken } from "./jwt";
import { providerExternalIdFromJwtClaims } from "./providerExternalIdFromJwt";
import { SystemRoles } from "../../constants/systemRoles";
import { ACCESS_TOKEN_KEY } from "../const.ts";
import { getStoredProfileAvatarUrl } from "./storedProfileAvatar";

const ROLE_CLAIM =
    "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";
/** .NET ClaimTypes.NameIdentifier (JWT subject / user id) */
const NAME_IDENTIFIER_CLAIM =
    "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";

export interface CurrentUser {
    id: number;
    displayName?: string;
    email?: string;
    role?: string;
    /** Google sub, Telegram id, etc. from JWT `externalId` claim (when present). */
    providerExternalId?: string;
    /** Google (or future) profile image; from localStorage until API adds JWT claim. */
    avatarUrl?: string;
}

export function getCurrentUser(): CurrentUser | null {
    const token = localStorage.getItem(ACCESS_TOKEN_KEY);
    if (!token) return null;

    try {
        const decoded = decodeToken(token);
        const rawId =
            decoded.nameid ??
            decoded.sub ??
            decoded[NAME_IDENTIFIER_CLAIM];
        const id = typeof rawId === "number" ? rawId : Number(rawId);

        const jwtAvatar =
            typeof decoded.avatarUrl === "string" && decoded.avatarUrl.startsWith("http")
                ? decoded.avatarUrl
                : undefined;

        const claims = decoded as unknown as Record<string, unknown>;
        const providerExt = providerExternalIdFromJwtClaims(claims);
        const providerExternalId =
            providerExt && providerExt !== "user" ? providerExt : undefined;

        return {
            id: Number.isFinite(id) ? id : 0,
            displayName: decoded.displayName,
            email: decoded.email,
            role: decoded[ROLE_CLAIM] as string | undefined,
            providerExternalId,
            avatarUrl: jwtAvatar ?? getStoredProfileAvatarUrl(),
        };
    } catch {
        return null;
    }
}

export function isAdmin(user?: CurrentUser | null): boolean {
    return user?.role === SystemRoles.Admin;
}

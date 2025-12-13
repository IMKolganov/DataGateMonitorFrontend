// src/constants/systemRoles.ts

export const SystemRoles = {
    Admin: "Admin",
    VpnUser: "VpnUser",
    Service: "Service",
} as const;

export type SystemRole = typeof SystemRoles[keyof typeof SystemRoles];
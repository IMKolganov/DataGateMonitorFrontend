import { apiRequest } from "../../api/apirequest";

export type LoginResponseWithTotp = {
  userId?: number;
  displayName?: string | null;
  email?: string | null;
  token?: string | null;
  expiration?: string;
  refreshToken?: string | null;
  refreshExpiration?: string | null;
  requiresTotp?: boolean;
  loginChallengeId?: string | null;
  requiresTotpSetup?: boolean;
};

export type TotpStatus = {
  isAdmin: boolean;
  totpEnabled: boolean;
  requiresTotpSetup: boolean;
};

export type TotpSetupInfo = {
  sharedSecret: string;
  otpAuthUri: string;
  issuer: string;
  accountName: string;
};

function unwrap<T>(res: { success?: boolean; data?: T } | T): T {
  if (res && typeof res === "object" && "data" in res && (res as { data?: T }).data !== undefined) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export async function verifyTotpLogin(loginChallengeId: string, code: string): Promise<LoginResponseWithTotp> {
  const res = await apiRequest<LoginResponseWithTotp>("post", "/api/auth/totp/verify-login", {
    data: { loginChallengeId, code },
  });
  return unwrap(res);
}

export async function getTotpStatus(): Promise<TotpStatus> {
  const res = await apiRequest<TotpStatus>("get", "/api/auth/totp/status");
  return unwrap(res);
}

export async function beginTotpSetup(): Promise<TotpSetupInfo> {
  const res = await apiRequest<TotpSetupInfo>("post", "/api/auth/totp/setup");
  return unwrap(res);
}

export async function confirmTotpSetup(code: string): Promise<void> {
  await apiRequest("post", "/api/auth/totp/confirm", { data: { code } });
}

export async function disableTotp(code: string, password: string): Promise<void> {
  await apiRequest("post", "/api/auth/totp/disable", { data: { code, password } });
}

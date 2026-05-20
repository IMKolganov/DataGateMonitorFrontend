import { apiRequest } from "../../api/apirequest";
import { REFRESH_TOKEN_KEY } from "../const";

export type UserSessionDto = {
  id: number;
  deviceId?: string | null;
  userAgent?: string | null;
  createdAt: string;
  expiresAt: string;
  isCurrent: boolean;
};

export type GetUserSessionsResponse = {
  sessions: UserSessionDto[];
};

function refreshHeader(): Record<string, string> {
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  return token ? { "X-Refresh-Token": token } : {};
}

export async function fetchAdminSessions(): Promise<GetUserSessionsResponse> {
  const res = await apiRequest<GetUserSessionsResponse>("get", "/api/auth/sessions", {
    headers: refreshHeader(),
  });
  return res.data ?? { sessions: [] };
}

export async function revokeAdminSession(sessionId: number): Promise<void> {
  await apiRequest("delete", `/api/auth/sessions/${sessionId}`);
}

export async function revokeOtherAdminSessions(): Promise<number> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
  const res = await apiRequest<number>("post", "/api/auth/sessions/revoke-others", {
    data: { keepRefreshToken: refreshToken },
  });
  return res.data ?? 0;
}

export async function revokeAllAdminSessions(): Promise<number> {
  const res = await apiRequest<number>("post", "/api/auth/sessions/revoke-all", {
    data: {},
  });
  return res.data ?? 0;
}

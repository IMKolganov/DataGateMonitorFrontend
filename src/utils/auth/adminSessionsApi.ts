import {
  deleteApiAuthSessionsSessionId,
  getApiAuthSessions,
  postApiAuthSessionsRevokeAll,
  postApiAuthSessionsRevokeOthers,
} from "../../api/orval/auth/auth";
import type { GetUserSessionsResponse } from "../../api/orvalModelShim";
import { REFRESH_TOKEN_KEY } from "../const";

export type { UserSessionDto, GetUserSessionsResponse } from "../../api/orvalModelShim";

function refreshRequestOptions() {
  const token = localStorage.getItem(REFRESH_TOKEN_KEY);
  return token ? { headers: { "X-Refresh-Token": token } } : undefined;
}

export async function fetchAdminSessions(): Promise<GetUserSessionsResponse> {
  const res = (await getApiAuthSessions(refreshRequestOptions())) as GetUserSessionsResponse | undefined;
  return res ?? { sessions: [] };
}

export async function revokeAdminSession(sessionId: number): Promise<void> {
  await deleteApiAuthSessionsSessionId(sessionId);
}

export async function revokeOtherAdminSessions(): Promise<number> {
  const refreshToken = localStorage.getItem(REFRESH_TOKEN_KEY) ?? undefined;
  const res = (await postApiAuthSessionsRevokeOthers(
    { keepRefreshToken: refreshToken },
    refreshRequestOptions(),
  )) as number | undefined;
  return res ?? 0;
}

export async function revokeAllAdminSessions(): Promise<number> {
  const res = (await postApiAuthSessionsRevokeAll({}, refreshRequestOptions())) as number | undefined;
  return res ?? 0;
}

import type { LoginResponse } from "../../api/orvalModelShim";
import { clearStoredProfileAvatarUrl } from "./storedProfileAvatar";
import { storeAuthTokens } from "./authTokens";

export const ADMIN_TOTP_SETUP_PATH = "/settings/security";

export type LoginFlowResult =
  | { kind: "tokens"; payload: LoginResponse }
  | { kind: "totp"; loginChallengeId: string; displayName?: string | null }
  | { kind: "setup_required"; payload: LoginResponse };

export type TotpChallengeState = {
  loginChallengeId: string;
  displayName?: string | null;
  /** Runs immediately before tokens are stored after a successful TOTP verify. */
  onBeforeStoreTokens?: () => void;
};

export function resolveLoginFlow(payload: LoginResponse | null | undefined): LoginFlowResult {
  if (!payload) {
    throw new Error("Empty login response.");
  }

  if (payload.requiresTotp && payload.loginChallengeId) {
    return {
      kind: "totp",
      loginChallengeId: payload.loginChallengeId,
      displayName: payload.displayName,
    };
  }

  if (!payload.token) {
    throw new Error("No token returned by API.");
  }

  if (payload.requiresTotpSetup) {
    return { kind: "setup_required", payload };
  }

  return { kind: "tokens", payload };
}

export type ApplyLoginFlowOptions = {
  redirectPath?: string;
  onTotpChallenge: (challenge: TotpChallengeState) => void;
  clearAvatar?: boolean;
  /** Runs immediately before tokens are stored (e.g. save Google profile picture). */
  onBeforeStoreTokens?: () => void;
};

/** Stores tokens and redirects, or delegates to TOTP challenge UI. */
export function applyLoginFlow(
  payload: LoginResponse,
  options: ApplyLoginFlowOptions,
): void {
  const flow = resolveLoginFlow(payload);
  const redirectPath = options.redirectPath ?? "/";

  if (flow.kind === "totp") {
    options.onTotpChallenge({
      loginChallengeId: flow.loginChallengeId,
      displayName: flow.displayName,
    });
    return;
  }

  if (options.clearAvatar !== false) {
    clearStoredProfileAvatarUrl();
  }

  options.onBeforeStoreTokens?.();

  if (flow.kind === "setup_required") {
    storeAuthTokens(flow.payload);
    window.location.href = ADMIN_TOTP_SETUP_PATH;
    return;
  }

  storeAuthTokens(flow.payload);
  window.location.href = redirectPath;
}

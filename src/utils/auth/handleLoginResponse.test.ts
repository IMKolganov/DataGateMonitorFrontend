import { describe, expect, it, vi, beforeEach } from "vitest";
import {
  applyLoginFlow,
  resolveLoginFlow,
  type TotpChallengeState,
} from "./handleLoginResponse";

describe("resolveLoginFlow", () => {
  it("returns totp when requiresTotp and loginChallengeId are present", () => {
    expect(
      resolveLoginFlow({
        requiresTotp: true,
        loginChallengeId: "challenge-1",
        displayName: "Alice",
      }),
    ).toEqual({
      kind: "totp",
      loginChallengeId: "challenge-1",
      displayName: "Alice",
    });
  });

  it("returns tokens when a token is present without totp setup", () => {
    expect(
      resolveLoginFlow({
        token: "jwt",
        refreshToken: "refresh",
      }),
    ).toEqual({
      kind: "tokens",
      payload: {
        token: "jwt",
        refreshToken: "refresh",
      },
    });
  });

  it("returns setup_required when token requires totp setup", () => {
    expect(
      resolveLoginFlow({
        token: "jwt",
        requiresTotpSetup: true,
      }),
    ).toEqual({
      kind: "setup_required",
      payload: {
        token: "jwt",
        requiresTotpSetup: true,
      },
    });
  });
});

describe("applyLoginFlow", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("delegates to onTotpChallenge for totp responses", () => {
    const onTotpChallenge = vi.fn<(challenge: TotpChallengeState) => void>();

    applyLoginFlow(
      {
        requiresTotp: true,
        loginChallengeId: "abc",
        displayName: "Bob",
      },
      { onTotpChallenge },
    );

    expect(onTotpChallenge).toHaveBeenCalledWith({
      loginChallengeId: "abc",
      displayName: "Bob",
    });
  });
});

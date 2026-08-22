import React, { useState } from "react";
import { FaShieldAlt, FaTimes } from "react-icons/fa";
import { postApiAuthTotpVerifyLogin } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { LoginResponse } from "../../api/orvalModelShim";
import { storeAuthTokens } from "../../utils/auth/authTokens";
import { clearStoredProfileAvatarUrl } from "../../utils/auth/storedProfileAvatar";
import { errorMessage } from "../../utils/errorMessage";

function isLoginChallengeExpiredMessage(message: string): boolean {
  return /challenge expired|too many invalid attempts|sign in again/i.test(message);
}

/** Digits only; this app uses standard 6-digit TOTP (OtpNet default). */
export function normalizeTotpCodeInput(raw: string): string {
  return raw.replace(/\D/g, "").slice(0, 6);
}

/** Accept clipboard when it is exactly 6 digits (spaces/punctuation ignored). */
export function extractSixDigitTotpFromClipboard(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  return digits.length === 6 ? digits : null;
}

type Props = {
  loginChallengeId: string;
  displayName?: string | null;
  redirectPath?: string;
  onBack?: () => void;
  onBeforeStoreTokens?: () => void;
};

const TotpChallengeForm: React.FC<Props> = ({
  loginChallengeId,
  displayName,
  redirectPath = "/",
  onBack,
  onBeforeStoreTokens,
}) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [challengeExpired, setChallengeExpired] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = code.trim().length === 6 && !loading;

  const applyCode = (next: string) => {
    setCode(normalizeTotpCodeInput(next));
  };

  const tryApplyClipboardSixDigits = async () => {
    if (code.length > 0) {
      return;
    }
    if (typeof navigator === "undefined" || !navigator.clipboard?.readText) {
      return;
    }
    try {
      const text = await navigator.clipboard.readText();
      const six = extractSixDigitTotpFromClipboard(text);
      if (six) {
        setCode(six);
      }
    } catch {
      // Permission denied or insecure context — ignore.
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasted = e.clipboardData.getData("text");
    const six = extractSixDigitTotpFromClipboard(pasted);
    if (six) {
      e.preventDefault();
      setCode(six);
      return;
    }
    const digits = normalizeTotpCodeInput(pasted);
    if (digits.length > 0) {
      e.preventDefault();
      setCode(digits);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setChallengeExpired(false);
    setLoading(true);
    try {
      const result = orvalPayload<LoginResponse>(
        await postApiAuthTotpVerifyLogin({
          loginChallengeId,
          code: code.trim(),
        }),
      );
      onBeforeStoreTokens?.();
      if (!onBeforeStoreTokens) {
        clearStoredProfileAvatarUrl();
      }
      storeAuthTokens(result);
      window.location.href = redirectPath;
    } catch (err: unknown) {
      const message = errorMessage(err);
      if (isLoginChallengeExpiredMessage(message)) {
        setChallengeExpired(true);
        setError(
          "This verification step expired. Go back and sign in again — you are not logged in yet, so there is nothing to log out of.",
        );
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-totp-screen" data-testid="totp-challenge-screen">
      <div className="login-totp-icon" aria-hidden>
        <FaShieldAlt />
      </div>
      <p className="login-totp-lead">
        {displayName ? (
          <>
            Signed in as <strong>{displayName}</strong>. Enter the 6-digit code from your authenticator app to finish signing in.
          </>
        ) : (
          <>Enter the 6-digit code from your authenticator app to finish signing in.</>
        )}
      </p>
      {error ? <p className="error-message">{error}</p> : null}
      <form onSubmit={handleSubmit}>
        <div className="login-item">
          <h4>Authentication code</h4>
          <div className="password-input-wrap login-totp-code-wrap">
            <input
              id="totp-challenge-code"
              name="totpCode"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              className="input-login login-totp-code-input"
              value={code}
              onChange={(e) => applyCode(e.target.value)}
              onPaste={handlePaste}
              onFocus={() => {
                void tryApplyClipboardSixDigits();
              }}
              placeholder="000000"
              autoFocus
              required
            />
            {code.length > 0 ? (
              <button
                type="button"
                className="password-toggle-btn"
                onClick={() => setCode("")}
                tabIndex={-1}
                title="Clear code"
                aria-label="Clear code"
              >
                <FaTimes aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
        <div className="login-item">
          <button
            type="submit"
            className="btn primary btn-fullwidth"
            disabled={!canSubmit || challengeExpired}
          >
            <FaShieldAlt className="icon" /> {loading ? "Verifying…" : "Verify and sign in"}
          </button>
        </div>
      </form>
      {onBack ? (
        <button
          type="button"
          className={`btn ${challengeExpired ? "primary" : "secondary"} btn-fullwidth login-totp-back`}
          onClick={onBack}
        >
          {challengeExpired ? "Sign in again" : "Back to sign in"}
        </button>
      ) : null}
    </div>
  );
};

export default TotpChallengeForm;

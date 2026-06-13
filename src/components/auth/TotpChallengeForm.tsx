import React, { useState } from "react";
import { FaShieldAlt } from "react-icons/fa";
import { postApiAuthTotpVerifyLogin } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { LoginResponse } from "../../api/orvalModelShim";
import { storeAuthTokens } from "../../utils/auth/authTokens";
import { clearStoredProfileAvatarUrl } from "../../utils/auth/storedProfileAvatar";
import { errorMessage } from "../../utils/errorMessage";

function isLoginChallengeExpiredMessage(message: string): boolean {
  return /challenge expired|too many invalid attempts|sign in again/i.test(message);
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

  const canSubmit = code.trim().length >= 6 && !loading;

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
          <input
            id="totp-challenge-code"
            name="totpCode"
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="input-login login-totp-code-input"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="000000"
            autoFocus
            required
          />
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

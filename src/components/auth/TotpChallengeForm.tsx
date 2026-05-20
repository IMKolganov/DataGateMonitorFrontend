import React, { useState } from "react";
import { FaShieldAlt } from "react-icons/fa";
import { postApiAuthTotpVerifyLogin } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { LoginResponse } from "../../api/orvalModelShim";
import { storeAuthTokens } from "../../utils/auth/authTokens";
import { clearStoredProfileAvatarUrl } from "../../utils/auth/storedProfileAvatar";
import { errorMessage } from "../../utils/errorMessage";

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
  const [loading, setLoading] = useState(false);

  const canSubmit = code.trim().length >= 6 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
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
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <p style={{ marginBottom: 12, lineHeight: 1.45 }}>
        {displayName ? (
          <>
            Signed in as <strong>{displayName}</strong>. Enter the 6-digit code from your authenticator app.
          </>
        ) : (
          <>Enter the 6-digit code from your authenticator app.</>
        )}
      </p>
      {error ? <p className="error-message">{error}</p> : null}
      <form onSubmit={handleSubmit}>
        <div className="login-item">
          <h4>Authentication code</h4>
          <input
            type="text"
            inputMode="numeric"
            autoComplete="one-time-code"
            className="input-login"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="000000"
            required
          />
        </div>
        <div className="login-item">
          <button type="submit" className="btn primary btn-fullwidth" disabled={!canSubmit}>
            <FaShieldAlt className="icon" /> {loading ? "Verifying…" : "Verify"}
          </button>
        </div>
      </form>
      {onBack ? (
        <button type="button" className="btn secondary btn-fullwidth" style={{ marginTop: 8 }} onClick={onBack}>
          Back to sign in
        </button>
      ) : null}
    </div>
  );
};

export default TotpChallengeForm;

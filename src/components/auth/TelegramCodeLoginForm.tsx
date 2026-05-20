import React, { useState } from "react";
import { FaTelegramPlane } from "react-icons/fa";
import { postApiAuthTelegramCodeLogin } from "../../api/orval/auth/auth";
import { orvalPayload } from "../../api/orvalPayload";
import type { LoginResponse } from "../../api/orvalModelShim";
import TotpChallengeForm from "./TotpChallengeForm";
import { applyLoginFlow, type TotpChallengeState } from "../../utils/auth/handleLoginResponse";
import { errorMessage } from "../../utils/errorMessage";

type Props = {
  redirectPath?: string;
};

const TelegramCodeLoginForm: React.FC<Props> = ({ redirectPath = "/" }) => {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [totpChallenge, setTotpChallenge] = useState<TotpChallengeState | null>(null);

  const canSubmit = code.trim().length >= 6 && !loading;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const payload = orvalPayload<LoginResponse>(
        await postApiAuthTelegramCodeLogin({ code: code.trim().toUpperCase() }),
      );

      applyLoginFlow(payload, {
        redirectPath,
        onTotpChallenge: setTotpChallenge,
      });
    } catch (err: unknown) {
      setError(errorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (totpChallenge) {
    return (
      <TotpChallengeForm
        loginChallengeId={totpChallenge.loginChallengeId}
        displayName={totpChallenge.displayName}
        redirectPath={redirectPath}
        onBack={() => setTotpChallenge(null)}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className="login-info-text">
        Open the DataGate VPN Telegram bot in a private chat, run <strong>/login_code</strong>, then paste the one-time code below. The code expires in a few minutes. Register in the bot with <strong>/register</strong> first if you have not already.
      </p>
      {error ? <p className="error-message">{error}</p> : null}
      <div className="login-item">
        <h4>One-time code</h4>
        <input
          id="telegram-login-code"
          type="text"
          inputMode="text"
          autoComplete="one-time-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s/g, ""))}
          className="input input-login"
          required
          placeholder="ABCD1234"
          maxLength={12}
          disabled={loading}
        />
      </div>
      <div className="login-item">
        <button type="submit" className="btn primary btn-fullwidth" disabled={!canSubmit}>
          <FaTelegramPlane className="icon" aria-hidden />
          {loading ? "Signing in…" : "Sign in with Telegram code"}
        </button>
      </div>
    </form>
  );
};

export default TelegramCodeLoginForm;

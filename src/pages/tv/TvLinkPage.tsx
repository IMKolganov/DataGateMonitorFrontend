import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, Navigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { FaTv } from "react-icons/fa";
import { apiRequest } from "../../api/apirequest";
import { ACCESS_TOKEN_KEY } from "../../utils/const";
import { loginUrlWithReturn } from "../../utils/auth/returnPath";
import { appVersion } from "../../version.ts";
import GdprFooterLinks from "../../components/gdpr/GdprFooterLinks";
import "../../css/Login.css";

type Preview = {
  sessionId: string;
  userCode: string;
  deviceName?: string | null;
  expiresAt: string;
  status: string;
};

function normalizeCode(raw: string): string {
  return raw.replace(/[\s-]/g, "").replace(/\D/g, "");
}

/**
 * TV device-linking approve page (phone).
 * Unauthenticated users are sent to /login?redirect=/tv/link?code=… then returned here.
 */
export default function TvLinkPage() {
  const [searchParams] = useSearchParams();
  const codeFromQuery = searchParams.get("code") ?? "";
  const [codeInput, setCodeInput] = useState(codeFromQuery);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<"approved" | "denied" | null>(null);

  const isLoggedIn = !!localStorage.getItem(ACCESS_TOKEN_KEY);
  const returnPath = useMemo(() => {
    const q = searchParams.toString();
    return q ? `/tv/link?${q}` : "/tv/link";
  }, [searchParams]);

  const displayCode = normalizeCode(codeInput || codeFromQuery);

  const loadPreview = useCallback(async (code: string) => {
    const normalized = normalizeCode(code);
    if (normalized.length !== 6) {
      setPreview(null);
      setError(normalized.length === 0 ? null : "Enter the 6-digit code from your TV.");
      return;
    }

    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await apiRequest<Preview>(
        "get",
        `/api/auth/tv/session/by-code/${encodeURIComponent(normalized)}`,
      );
      if (!res.success || !res.data) {
        setPreview(null);
        setError(res.errorMessage || "Could not look up this TV code.");
        return;
      }
      setPreview(res.data);
    } catch (err: unknown) {
      setPreview(null);
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response
        ?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 410) setError(message || "This code has expired.");
      else if (status === 404) setError(message || "Code not found.");
      else setError(message || "Could not look up this TV code.");
    } finally {
      setBusy(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoggedIn) return;
    if (codeFromQuery) {
      setCodeInput(codeFromQuery);
      void loadPreview(codeFromQuery);
    }
  }, [codeFromQuery, isLoggedIn, loadPreview]);

  if (!isLoggedIn) {
    return <Navigate to={loginUrlWithReturn(returnPath)} replace />;
  }

  const approve = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await apiRequest<{ status: string }>("post", "/api/auth/tv/session/approve", {
        data: { sessionId: preview.sessionId },
      });
      if (!res.success) {
        toast.error(res.errorMessage || "Could not approve TV login.");
        return;
      }
      toast.success("TV login approved. You can return to your TV.");
      setDone("approved");
      setPreview(null);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Could not approve TV login.");
    } finally {
      setBusy(false);
    }
  };

  const deny = async () => {
    if (!preview) return;
    setBusy(true);
    try {
      const res = await apiRequest<{ status: string }>("post", "/api/auth/tv/session/deny", {
        data: { sessionId: preview.sessionId },
      });
      if (!res.success) {
        toast.error(res.errorMessage || "Could not deny TV login.");
        return;
      }
      toast.info("TV login denied.");
      setDone("denied");
      setPreview(null);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Could not deny TV login.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-wrapper">
        <div className="login-logo-circle">
          <img src="/favicon.png" alt="Logo" className="logo-icon-login" />
        </div>

        <h1 className="login-page-title">
          <FaTv className="icon" aria-hidden style={{ marginRight: 8, verticalAlign: "middle" }} />
          Link your TV
        </h1>

        <div className="login">
          <p className="login-info-text" style={{ marginBottom: 12 }}>
            Enter the code shown on your TV, or keep this page open after scanning the QR code.
          </p>

          {displayCode.length === 6 && (
            <p
              className="login-info-text"
              style={{
                marginBottom: 16,
                fontSize: "1.5rem",
                fontWeight: 700,
                letterSpacing: "0.2em",
                textAlign: "center",
                fontVariantNumeric: "tabular-nums",
              }}
              aria-label="TV link code"
            >
              {displayCode}
            </p>
          )}

          <div className="login-item">
            <label htmlFor="tv-code">Code</label>
            <input
              id="tv-code"
              className="input-login"
              value={codeInput}
              onChange={(e) => setCodeInput(e.target.value)}
              placeholder="482913"
              inputMode="numeric"
              autoComplete="one-time-code"
              spellCheck={false}
              maxLength={8}
            />
          </div>

          <div className="login-item">
            <button
              type="button"
              className="btn secondary"
              disabled={busy}
              onClick={() => void loadPreview(codeInput)}
              style={{ width: "100%" }}
            >
              Look up
            </button>
          </div>

          {error && <p className="error-message">{error}</p>}

          {done === "approved" && (
            <p className="login-info-text">Approved. You can return to your TV — it should finish signing in.</p>
          )}
          {done === "denied" && (
            <p className="login-info-text">Denied. The TV will not be signed in with your account.</p>
          )}

          {preview && !done && (
            <>
              <p className="login-info-text" style={{ marginTop: 8, marginBottom: 12 }}>
                {preview.deviceName
                  ? `Approve login for “${preview.deviceName}”?`
                  : "Approve login for this TV?"}
              </p>
              <div className="login-item" style={{ display: "flex", gap: 8 }}>
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => void approve()}
                  style={{ flex: 1 }}
                >
                  Approve
                </button>
                <button
                  type="button"
                  className="btn secondary"
                  disabled={busy}
                  onClick={() => void deny()}
                  style={{ flex: 1 }}
                >
                  Deny
                </button>
              </div>
            </>
          )}
        </div>

        <div className="register-container">
          <p>
            <Link to="/" className="register-link">
              Go to dashboard
            </Link>
          </p>
          <p>
            © {new Date().getFullYear()} DataGate Monitor v.{appVersion}
          </p>
          <GdprFooterLinks />
        </div>
      </div>
    </div>
  );
}

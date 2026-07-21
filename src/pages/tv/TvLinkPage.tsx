import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "react-toastify";
import { apiRequest } from "../../api/apirequest";
import { ACCESS_TOKEN_KEY } from "../../utils/const";
import "../../css/TvLinkPage.css";

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

function formatCode(normalized: string): string {
  return normalized;
}

/**
 * Minimal TV device-linking landing page.
 * Contract: GET /tv/link?code=482913 — phone opens this from QR or types the 6-digit code.
 */
export default function TvLinkPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const codeFromQuery = searchParams.get("code") ?? "";
  const [codeInput, setCodeInput] = useState(codeFromQuery);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isLoggedIn = useMemo(() => !!localStorage.getItem(ACCESS_TOKEN_KEY), []);
  const displayCode = formatCode(normalizeCode(codeInput || codeFromQuery));

  const loadPreview = useCallback(async (code: string) => {
    const normalized = normalizeCode(code);
    if (normalized.length !== 6) {
      setPreview(null);
      setError(normalized.length === 0 ? null : "Enter the 6-digit code from your TV.");
      return;
    }

    if (!isLoggedIn) {
      setPreview(null);
      setError(null);
      return;
    }

    setBusy(true);
    setError(null);
    try {
      const res = await apiRequest<Preview>(
        "get",
        `/api/auth/tv/session/by-code/${encodeURIComponent(formatCode(normalized))}`,
      );
      if (!res.success || !res.data) {
        setPreview(null);
        setError(res.errorMessage || "Could not look up this TV code.");
        return;
      }
      setPreview(res.data);
    } catch (err: unknown) {
      setPreview(null);
      const status = (err as { response?: { status?: number; data?: { message?: string } } })?.response?.status;
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      if (status === 410) setError(message || "This code has expired.");
      else if (status === 404) setError(message || "Code not found.");
      else setError(message || "Could not look up this TV code.");
    } finally {
      setBusy(false);
    }
  }, [isLoggedIn]);

  useEffect(() => {
    if (codeFromQuery) {
      setCodeInput(codeFromQuery);
      void loadPreview(codeFromQuery);
    }
  }, [codeFromQuery, loadPreview]);

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
      setPreview(null);
    } catch (err: unknown) {
      const message = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      toast.error(message || "Could not deny TV login.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="tv-link-page">
      <div className="tv-link-page__panel">
        <p className="tv-link-page__brand">DataGate</p>
        <h1 className="tv-link-page__title">Link your TV</h1>
        <p className="tv-link-page__lead">
          Enter the code shown on your TV, or open this page from the QR code.
        </p>

        {displayCode && (
          <p className="tv-link-page__code" aria-label="TV link code">
            {displayCode}
          </p>
        )}

        <label className="tv-link-page__label" htmlFor="tv-code">
          Code
        </label>
        <div className="tv-link-page__row">
          <input
            id="tv-code"
            className="tv-link-page__input"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
            placeholder="482913"
            inputMode="numeric"
            autoComplete="one-time-code"
            spellCheck={false}
            maxLength={8}
          />
          <button
            type="button"
            className="tv-link-page__secondary"
            disabled={busy}
            onClick={() => void loadPreview(codeInput)}
          >
            Look up
          </button>
        </div>

        {error && <p className="tv-link-page__error">{error}</p>}

        {!isLoggedIn && (
          <div className="tv-link-page__actions">
            <p className="tv-link-page__hint">
              Sign in to DataGate on this device, then approve the TV login.
            </p>
            <button
              type="button"
              className="tv-link-page__primary"
              onClick={() => navigate("/login")}
            >
              Sign in to approve
            </button>
            <p className="tv-link-page__hint">
              After sign-in, reopen this page (or the QR link) to approve. Or enter the code in the DataGate mobile app.
            </p>
          </div>
        )}

        {isLoggedIn && preview && (
          <div className="tv-link-page__actions">
            <p className="tv-link-page__hint">
              {preview.deviceName
                ? `Approve login for “${preview.deviceName}”?`
                : "Approve login for this TV?"}
            </p>
            <button type="button" className="tv-link-page__primary" disabled={busy} onClick={() => void approve()}>
              Approve
            </button>
            <button type="button" className="tv-link-page__secondary" disabled={busy} onClick={() => void deny()}>
              Deny
            </button>
          </div>
        )}

        <p className="tv-link-page__footer">
          <Link to="/login">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

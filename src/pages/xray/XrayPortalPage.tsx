import React, { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { FaTelegramPlane } from "react-icons/fa";
import { useGetApiV2OpenVpnServersGetAll } from "../../api/orval/vpn-servers-v2/vpn-servers-v2";
import {
  postApiXrayClientLinksAddWithToken,
  postApiXrayClientLinksDownloadFileByCn,
} from "../../api/orval/xray-client-links/xray-client-links";
import type {
  AddFileRequest,
  DownloadFileResponse,
  VpnServerV2Dto,
  VpnServersV2Response,
} from "../../api/orvalModelShim";
import { ACCESS_TOKEN_KEY } from "../../utils/const";
import { decodeToken } from "../../utils/auth/jwt";
import { VpnServerType } from "../../constants/vpnServerType";
import { getXrayLanguage, setXrayLanguage, XRAY_LANGUAGE_OPTIONS, XRAY_TRANSLATIONS } from "./i18n";
import { appVersion } from "../../version";
import "../../css/XrayPortal.css";

const NAME_IDENTIFIER_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier";
const EMAIL_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress";
const DISPLAY_NAME_CLAIM = "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name";

function normalizeServers(payload: VpnServersV2Response | undefined): VpnServerV2Dto[] {
  return payload?.vpnServers?.filter(Boolean) ?? [];
}

function decodeBase64Utf8(value: string): string {
  try {
    const bytes = Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return value;
  }
}

function claimString(source: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  return "";
}

const XrayPortalPage: React.FC = () => {
  const [busyServerId, setBusyServerId] = useState<number | null>(null);
  const [status, setStatus] = useState<string>("");
  const [generatedLink, setGeneratedLink] = useState<string>("");
  const [generatedDetails, setGeneratedDetails] = useState<string>("");
  const [lang, setLang] = useState(getXrayLanguage);
  const t = XRAY_TRANSLATIONS[lang].portal;

  const accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!accessToken) {
    return <Navigate to="/xray/login" replace />;
  }

  const userInfo = useMemo(() => {
    try {
      const token = decodeToken(accessToken);
      const claims = token as Record<string, unknown>;
      const rawId = claimString(claims, "nameid", "sub", NAME_IDENTIFIER_CLAIM);
      const rawName = claimString(
        claims,
        "displayName",
        "email",
        EMAIL_CLAIM,
        DISPLAY_NAME_CLAIM,
        "nameid",
        "sub",
        NAME_IDENTIFIER_CLAIM,
      );
      return {
        externalId: String(rawId || "user"),
        issuedTo: String(rawName || "user"),
      };
    } catch {
      return {
        externalId: "user",
        issuedTo: "user",
      };
    }
  }, [accessToken]);

  const serversQuery = useGetApiV2OpenVpnServersGetAll(undefined, {
    query: {
      refetchOnWindowFocus: false,
    },
  });

  const xrayServers = useMemo(() => {
    const servers = normalizeServers(serversQuery.data as VpnServersV2Response);
    return servers.filter(
      (server) => server.serverType === VpnServerType.Xray && server.isAccessibleForUserQuotaPlan !== false,
    );
  }, [serversQuery.data]);

  const handleLogout = () => {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("refreshExpiration");
    window.location.href = "/xray/login";
  };

  const handleGetAccess = async (server: VpnServerV2Dto) => {
    if (!server.id) return;
    setBusyServerId(server.id);
    setStatus("");
    setGeneratedLink("");
    setGeneratedDetails("");

    try {
      const shortExternalId = userInfo.externalId.slice(0, 64);
      const generatedCommonName = `xray-${shortExternalId}-${Date.now()}`;
      const payload: AddFileRequest = {
        vpnServerId: server.id,
        externalId: shortExternalId,
        issuedTo: userInfo.issuedTo.slice(0, 128),
        commonName: generatedCommonName,
      };

      const result = (await postApiXrayClientLinksAddWithToken(payload)) as {
        issuedOvpnFile?: { vpnServerId?: number; commonName?: string | null };
        issuedOvpnFileToken?: { token?: string | null };
      };

      const vpnServerId = result.issuedOvpnFile?.vpnServerId;
      const commonName = result.issuedOvpnFile?.commonName?.trim();
      if (!vpnServerId || !commonName) {
        setStatus(t.accessCreatedNoToken);
        return;
      }

      const downloadPayload = {
        vpnServerId,
        commonName,
      };
      const downloaded = (await postApiXrayClientLinksDownloadFileByCn(downloadPayload)) as
        | DownloadFileResponse
        | { data?: DownloadFileResponse };
      const envelope = downloaded as { data?: DownloadFileResponse };
      const direct = downloaded as DownloadFileResponse;
      const content = (envelope.data?.content ?? direct.content ?? "").trim();
      const decoded = decodeBase64Utf8(content).trim();
      const lines = decoded.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
      const vlessLine = lines.find((line) => line.startsWith("vless://")) ?? "";
      if (!vlessLine) {
        setStatus(t.accessCreatedNoToken);
        return;
      }

      setGeneratedLink(vlessLine);
      setGeneratedDetails(decoded);
      setStatus(t.accessLinkReady);
    } catch (e: unknown) {
      setStatus(e instanceof Error ? e.message : t.failedCreateAccess);
    } finally {
      setBusyServerId(null);
    }
  };

  return (
    <div className="xray-page">
      <div className="xray-language-row xray-language-row--portal">
        <label htmlFor="xray-portal-lang" className="xray-language-label">
          Language
        </label>
        <select
          id="xray-portal-lang"
          className="xray-language-select"
          value={lang}
          onChange={(event) => {
            const next = event.target.value as typeof lang;
            setLang(next);
            setXrayLanguage(next);
          }}
        >
          {XRAY_LANGUAGE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <div className="xray-topbar">
        <h1 className="xray-title">{t.title}</h1>
        <button className="btn secondary" type="button" onClick={handleLogout}>
          {t.logout}
        </button>
      </div>

      <p className="xray-subtitle">{t.subtitle}</p>

      {serversQuery.isLoading && <p className="xray-note">{t.loadingServers}</p>}
      {serversQuery.isError && <p className="xray-error">{t.failedLoadServers}</p>}
      {!serversQuery.isLoading && !serversQuery.isError && xrayServers.length === 0 && (
        <p className="xray-note">{t.noServers}</p>
      )}

      <div className="xray-grid">
        {xrayServers.map((server) => {
          const isBusy = busyServerId === server.id;
          return (
            <article key={server.id ?? server.serverName} className="xray-card">
              <h3>{server.serverName || `${t.serverFallback} #${server.id}`}</h3>
              <p className="xray-note">
                {t.status}: {server.isOnline ? t.online : t.offline}
              </p>
              <button
                className="btn primary btn-fullwidth"
                type="button"
                onClick={() => void handleGetAccess(server)}
                disabled={isBusy || !server.id}
              >
                {isBusy ? t.generating : t.getAccess}
              </button>
            </article>
          );
        })}
      </div>

      {status && <p className={generatedLink ? "xray-success" : "xray-error"}>{status}</p>}
      {generatedLink && (
        <div className="xray-result">
          <label className="xray-label" htmlFor="xray-link-result">
            {t.yourLink}
          </label>
          <div className="xray-link-row">
            <input id="xray-link-result" className="input-login" value={generatedLink} readOnly />
            <button
              className="btn secondary"
              type="button"
              onClick={() => void navigator.clipboard.writeText(generatedLink)}
            >
              {t.copy}
            </button>
          </div>
          {generatedDetails && (
            <pre className="xray-note xray-link-details">{generatedDetails}</pre>
          )}
        </div>
      )}

      <section className="xray-info-grid" aria-label="Additional resources">
        <article className="xray-card">
          <h3>{t.telegramTitle}</h3>
          <p className="xray-note">{t.telegramDescription}</p>
          <a
            className="xray-telegram-button"
            href="https://t.me/datagateapp"
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaTelegramPlane aria-hidden />
            <span>{t.telegramLink}</span>
          </a>
        </article>

        <article className="xray-card">
          <h3>{t.appsTitle}</h3>
          <p className="xray-note">{t.appsDescription}</p>
          <a
            className="xray-datagate-button"
            href="https://datagateapp.com/download"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img src="/favicon.png" alt="" aria-hidden className="xray-datagate-logo" />
            <span>{t.appsLink}</span>
          </a>
          <p className="xray-warning">{t.warningIos}</p>
        </article>
      </section>

      <p className="xray-note xray-login-version">© {new Date().getFullYear()} DataGate Monitor v.{appVersion}</p>
    </div>
  );
};

export default XrayPortalPage;

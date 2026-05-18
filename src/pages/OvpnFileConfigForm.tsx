// src/pages/OvpnFileConfigForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import "../css/OvpnFileConfigForm.css";
import "../css/Settings.css";
import { FaPlus, FaCopy, FaArrowLeft, FaSync, FaHistory } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";

import {
  useGetApiOpenVpnConfigsGetVpnServerId,
  usePostApiOpenVpnConfigsAddUpdate,
} from "../api/orval/vpn-server-ovpn-file-config/vpn-server-ovpn-file-config";

import {
  useGetApiOpenVpnServersConflogHistoryByServerVpnServerId,
  usePostApiOpenVpnServersConflogFetchAndSaveByServerVpnServerId,
  getGetApiOpenVpnServersConflogHistoryByServerVpnServerIdQueryKey,
} from "../api/orval/vpn-server-conflog/vpn-server-conflog";

import type {
  AddOrUpdateOvpnFileConfigRequest,
  OvpnFileConfigResponse,
  VpnServerResponse,
  RootOpenVpnInfoResponse,
} from "../api/orvalModelShim";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import "../css/Table.css";
import { highlightOvpnConfig } from "../utils/ovpnConfigHighlight";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../utils/errorMessage";
import { useGetApiOpenVpnServersGetVpnServerId } from "../api/orval/vpn-servers/vpn-servers";
import { isOpenVpnStack, VpnServerType } from "../constants/vpnServerType";
import { OpenVpnServerFeaturePlaceholder } from "../components/servers/OpenVpnServerFeaturePlaceholder";
import { ServerAccessDenied } from "../components/ServerAccessDenied";
import { getCurrentUser, isAdmin } from "../utils/auth/authSelectors";
import { isHttpForbidden } from "../utils/httpError";

/** Extract proto from config template (e.g. "proto tcp" or "proto udp") */
function extractProtoFromTemplate(template: string): string | null {
  const m = template.match(/proto\s+(tcp|udp)/i);
  return m ? m[1].toLowerCase() : null;
}

function normalizeProto(value: unknown): "tcp" | "udp" | null {
  if (typeof value !== "string") return null;
  const v = value.trim().toLowerCase();
  return v === "tcp" || v === "udp" ? v : null;
}

function applyProtoToTemplate(template: string, proto: "tcp" | "udp"): string {
  if (!template.trim()) return template;
  if (/^\s*proto\s+\S+/im.test(template)) {
    return template.replace(/^\s*proto\s+\S+/im, `proto ${proto}`);
  }
  return `proto ${proto}\n${template}`;
}

const SAMPLE_TEMPLATE = `setenv FRIENDLY_NAME "{{friendly_name}}"
client
dev tun
proto tcp
remote {{server_ip}} {{server_port}}
resolv-retry infinite
nobind
remote-cert-tls server
tls-version-min 1.2
cipher AES-256-CBC
auth SHA256
auth-nocache
verb 3
<ca>
{{ca_cert}}
</ca>
<cert>
{{client_cert}}
</cert>
<key>
{{client_key}}
</key>
<tls-crypt>
{{tls_auth_key}}
</tls-crypt>`;

const DEFAULT_CONFLOG_PAGE_SIZE = 10;

interface ConflogRow {
  id?: number;
  vpnServerId?: number | null;
  requestUrl?: string | null;
  payload?: RootOpenVpnInfoResponse;
  createDate?: string;
}

const OvpnFileConfigForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const parsedVpnServerId = Number(vpnServerId) || 0;
  const canManageExportConfig = isAdmin(getCurrentUser());
  const serverKindQuery = useGetApiOpenVpnServersGetVpnServerId(parsedVpnServerId, {
    query: {
      enabled: parsedVpnServerId > 0,
      staleTime: 10_000,
      retry: 1,
    },
  });
  const serverType = (serverKindQuery.data as VpnServerResponse | undefined)?.vpnServer?.serverType;
  const openVpnPageEnabled =
    parsedVpnServerId > 0 && serverKindQuery.isSuccess && isOpenVpnStack(serverType);
  const isXrayStack = parsedVpnServerId > 0 && serverType === VpnServerType.Xray;
  const exportConfigPageEnabled = openVpnPageEnabled || isXrayStack;
  const highlightPreRef = React.useRef<HTMLPreElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [conflogPageSize, setConflogPageSize] = usePersistedPageSize(
    parsedVpnServerId > 0 ? `ovpn-conflog:${parsedVpnServerId}` : "ovpn-conflog:0",
    DEFAULT_CONFLOG_PAGE_SIZE,
    "5,10,20,50,100",
  );

  // local UI state (kept in PascalCase to match form field names)
  const [ovpnFileConfig, setServerConfig] = useState({
    Id: 0,
    VpnServerId: parsedVpnServerId,
    VpnServerIp: "",
    VpnServerPort: 1194,
    ConfigTemplate: "",
  });

  const [errors, setErrors] = useState<{ VpnServerIp: string; VpnServerPort: string; apiError?: string }>({
    VpnServerIp: "",
    VpnServerPort: "",
  });

  const [copyStatus, setCopyStatus] = useState<"Copy" | "Copied!">("Copy");
  const [autoDetectServerSettings, setAutoDetectServerSettings] = useState(true);

  // load config via orval hook (auto-unwrapped response)
  const {
    data,
    isFetching,
    isError,
    error,
  } = useGetApiOpenVpnConfigsGetVpnServerId<OvpnFileConfigResponse>(
    parsedVpnServerId,
    {
      query: {
        enabled: parsedVpnServerId > 0 && exportConfigPageEnabled && canManageExportConfig,
        staleTime: 0,
        retry: 1,
      },
    },
  );

  const configAccessDenied = isError && isHttpForbidden(error);

  // mutation for save
  const saveMutation = usePostApiOpenVpnConfigsAddUpdate();

  const [conflogPageState, setConflogPageState] = useState({ serverId: parsedVpnServerId, page: 1 });
  if (conflogPageState.serverId !== parsedVpnServerId) {
    setConflogPageState({ serverId: parsedVpnServerId, page: 1 });
  }
  const conflogPage = conflogPageState.page;
  const setConflogPage = (page: number) =>
    setConflogPageState((s) => ({ ...s, page }));

  const conflogHistoryParams = useMemo(
    () => ({ page: conflogPage, pageSize: conflogPageSize }),
    [conflogPage, conflogPageSize]
  );
  const { data: conflogHistoryResp, isFetching: isConflogLoading } =
    useGetApiOpenVpnServersConflogHistoryByServerVpnServerId(
      parsedVpnServerId,
      conflogHistoryParams,
      { query: { enabled: parsedVpnServerId > 0 && openVpnPageEnabled } }
    );

  const latestConflogParams = useMemo(() => ({ page: 1, pageSize: 1 }), []);
  const { data: latestConflogResp } = useGetApiOpenVpnServersConflogHistoryByServerVpnServerId(
    parsedVpnServerId,
    latestConflogParams,
    { query: { enabled: parsedVpnServerId > 0 && openVpnPageEnabled } }
  );
  const latestConflogItem = (latestConflogResp as { items?: ConflogRow[] } | undefined)?.items?.[0];
  const latestPayload = latestConflogItem?.payload;
  const latestConfig = latestPayload?.config;

  const conflogPageData = conflogHistoryResp as
    | { items?: ConflogRow[] | null; totalCount?: number | null }
    | undefined;
  const conflogItems: ConflogRow[] = (conflogPageData?.items ?? []) as ConflogRow[];
  const conflogTotalCount = conflogPageData?.totalCount ?? conflogItems.length;

  const fetchAndSaveConflogMutation = usePostApiOpenVpnServersConflogFetchAndSaveByServerVpnServerId({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: getGetApiOpenVpnServersConflogHistoryByServerVpnServerIdQueryKey(
            parsedVpnServerId,
            conflogHistoryParams
          ),
        });
        toast.success("Conflog fetched and saved");
      },
      onError: (err: unknown) => {
        toast.error(getErrorMessage(err));
      },
    },
  });

  const conflogRows = conflogItems.map((row, idx) => {
    const payload = row.payload;
    const cfg = payload?.config;
    const mgmt = cfg?.openVpnManagement;

    return {
      id: row.id ?? idx,
      requestUrl: row.requestUrl ?? "—",
      version: payload?.version ?? "—",
      application: payload?.application ?? "—",
      environment: payload?.environment ?? "—",
      vpnSubnet: cfg?.vpnSubnet ?? "—",
      vpnNetmask: cfg?.vpnNetmask ?? "—",
      ovpnPort: cfg?.port ?? "—",
      ovpnProto: cfg?.proto ?? "—",
      apiPort: cfg?.apiPort ?? "—",
      management: mgmt ? `${mgmt.host}:${mgmt.port}` : "—",
      createDate: row.createDate ? new Date(row.createDate).toLocaleString() : "—",
    };
  });

  const templateProto = useMemo(
    () => extractProtoFromTemplate(ovpnFileConfig.ConfigTemplate || ""),
    [ovpnFileConfig.ConfigTemplate]
  );
  const templatePort = ovpnFileConfig.VpnServerPort != null ? String(ovpnFileConfig.VpnServerPort) : null;
  const serverPort = latestConfig?.port != null ? String(latestConfig.port).trim() : null;
  const serverProto = normalizeProto(latestConfig?.proto);
  const detectedPort = latestConfig?.port != null ? Number(latestConfig.port) : null;
  const configMismatch = useMemo(() => {
    const mismatches: string[] = [];
    if (serverPort != null && templatePort != null && serverPort !== templatePort) {
      mismatches.push(`Port: server has ${serverPort}, template has ${templatePort}`);
    }
    if (serverProto != null && templateProto != null && serverProto !== templateProto) {
      mismatches.push(`Proto: server has ${serverProto}, template has ${templateProto}`);
    }
    return mismatches;
  }, [serverPort, templatePort, serverProto, templateProto]);

  const conflogColumns: GridColDef[] = [
    { field: "id", headerName: "Id", width: 70 },
    { field: "requestUrl", headerName: "Request URL", flex: 1.1, minWidth: 160 },
    { field: "version", headerName: "Version", width: 120 },
    { field: "application", headerName: "Application", flex: 1.1, minWidth: 160 },
    { field: "environment", headerName: "Environment", width: 140 },
    { field: "vpnSubnet", headerName: "VPN Subnet", width: 140 },
    { field: "vpnNetmask", headerName: "VPN Netmask", width: 140 },
    { field: "ovpnPort", headerName: "OVPN Port", width: 110 },
    { field: "ovpnProto", headerName: "OVPN Proto", width: 120 },
    { field: "apiPort", headerName: "API Port", width: 110 },
    { field: "management", headerName: "Mgmt host:port", flex: 1, minWidth: 160 },
    { field: "createDate", headerName: "Created", flex: 0.9, minWidth: 150 },
  ];

  // small helper to extract readable error messages
  const getErrorMessage = (err: unknown): string => {
    if (axios.isAxiosError(err)) {
      const resp = err.response?.data;
      if (typeof resp === "string") return resp;
      if (resp && typeof resp === "object") {
        const r = resp as Record<string, unknown>;
        const mStr =
          axiosResponseDataMessage(resp) ??
          (typeof r["Message"] === "string" ? r["Message"] : undefined);
        const dStr =
          (typeof r["detail"] === "string" ? r["detail"] : undefined) ??
          (typeof r["Detail"] === "string" ? r["Detail"] : undefined);
        if (mStr && dStr) return `${mStr} Details: ${dStr}`;
        if (mStr) return mStr;
        if (dStr) return dStr;
      }
      return err.message || "Unknown error";
    }
    const nonAxios = err as { data?: unknown };
    const resp = nonAxios?.data ?? err;
    if (typeof resp === "string") return resp;
    if (resp && typeof resp === "object") {
      const r = resp as Record<string, unknown>;
      const msg = r["message"] ?? r["Message"];
      const detail = r["detail"] ?? r["Detail"];
      if (typeof msg === "string" && typeof detail === "string") return `${msg} Details: ${detail}`;
      if (typeof msg === "string") return msg;
      if (typeof detail === "string") return detail;
    }
    return errorMessage(err);
  };

  const [configSource, setConfigSource] = useState(data);
  if (data && data !== configSource) {
    setConfigSource(data);
    setServerConfig((prev) => ({
      ...prev,
      Id: data.id ?? 0,
      VpnServerId: data.vpnServerId ?? parsedVpnServerId,
      VpnServerIp: data.vpnServerIp ?? "",
      VpnServerPort: Number(data.vpnServerPort ?? 1194),
      ConfigTemplate: data.configTemplate ?? "",
    }));
    setAutoDetectServerSettings(true);
  }

  // toast on load error (once per state change)
  useEffect(() => {
    if (isError && !isHttpForbidden(error)) {
      toast.error(`Failed to load VPN server configuration: ${getErrorMessage(error)}`, {
        toastId: "ovpn-config-load-error",
      });
    }
  }, [isError, error]);

  const loading = useMemo(() => isFetching || saveMutation.isPending, [isFetching, saveMutation.isPending]);

  if (!canManageExportConfig) {
    return (
      <ServerAccessDenied message="Client export configuration is available to administrators only." />
    );
  }

  if (configAccessDenied) {
    return <ServerAccessDenied />;
  }

  if (parsedVpnServerId > 0 && serverKindQuery.isSuccess && !exportConfigPageEnabled) {
    return (
      <OpenVpnServerFeaturePlaceholder
        vpnServerId={String(vpnServerId)}
        featureLabel="Client export configuration"
      >
        <p style={{ marginTop: 8 }}>This server type does not use the dashboard export template.</p>
      </OpenVpnServerFeaturePlaceholder>
    );
  }

  if (parsedVpnServerId > 0 && serverKindQuery.isPending) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>Loading server…</p>
      </div>
    );
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setServerConfig((prev) => ({
      ...prev,
      [name]: name === "VpnServerPort" ? Number(value) : value,
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = { VpnServerIp: "", VpnServerPort: "" };

    if (!ovpnFileConfig.VpnServerIp.trim()) {
      newErrors.VpnServerIp = "VPN Server IP is required.";
      isValid = false;
    }
    const effectivePort =
      autoDetectServerSettings && typeof detectedPort === "number" && Number.isFinite(detectedPort)
        ? detectedPort
        : ovpnFileConfig.VpnServerPort;
    if (!effectivePort || effectivePort < 1 || effectivePort > 65535) {
      newErrors.VpnServerPort = "VPN Server Port must be between 1 and 65535.";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus("Copy"), 2000);
    } catch {
      toast.error("Failed to copy text");
      setCopyStatus("Copy");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const effectivePort =
      autoDetectServerSettings && typeof detectedPort === "number" && Number.isFinite(detectedPort)
        ? detectedPort
        : ovpnFileConfig.VpnServerPort;
    const effectiveTemplate =
      autoDetectServerSettings && serverProto
        ? applyProtoToTemplate(ovpnFileConfig.ConfigTemplate, serverProto)
        : ovpnFileConfig.ConfigTemplate;

    const payload: AddOrUpdateOvpnFileConfigRequest = {
      vpnServerId: ovpnFileConfig.VpnServerId || parsedVpnServerId,
      vpnServerIp: ovpnFileConfig.VpnServerIp.trim(),
      vpnServerPort: effectivePort,
      configTemplate: effectiveTemplate,
      autoDetectServerSettings,
    };

    try {
      await toast.promise(
        saveMutation.mutateAsync({ data: payload }),
        {
          pending: isXrayStack ? "Saving client export template…" : "Saving OpenVPN file config…",
          success: isXrayStack ? "Client export template saved" : "OpenVPN file config saved",
          error: {
            render({ data }) {
              return getErrorMessage(data);
            },
          },
        }
      );

      setErrors({ VpnServerIp: "", VpnServerPort: "" });
      navigate(`/servers/${parsedVpnServerId}/certificates`);
    } catch (err) {
      const msg = getErrorMessage(err);
      setErrors((prev) => ({ ...prev, apiError: msg }));
    }
  };

  return (
    <div>
      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading configuration...</p>
        </div>
      ) : (
        <div className="server-form-container">
          <h2 className="server-form-header">
            {vpnServerId
              ? isXrayStack
                ? "Edit VLESS client export template"
                : "Edit OpenVPN File Config"
              : "Add New Ovpn File Config"}
          </h2>

          {isXrayStack ? (
            <div
              className="server-details__muted"
              role="note"
              style={{
                margin: "0 0 16px",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-default, #30363d)",
                background: "rgba(56, 139, 253, 0.08)",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              <strong>Xray (VLESS)</strong> — this screen is only the <strong>export template</strong> (text with
              placeholders like <code>{"{{vless_uri}}"}</code>). It is <strong>not</strong> an OpenVPN server profile.
              Issued links are created under <strong>Client links (VLESS)</strong> → <strong>Create client link</strong>.
            </div>
          ) : (
            <div
              className="server-details__muted"
              role="note"
              style={{
                margin: "0 0 16px",
                padding: "12px 14px",
                borderRadius: 8,
                border: "1px solid var(--border-default, #30363d)",
                lineHeight: 1.5,
                fontSize: 14,
              }}
            >
              <strong>OpenVPN</strong> — template drives generated <code>.ovpn</code> files. New files:{" "}
              <strong>Configurations</strong> is linked from <strong>Make new OVPN file</strong> → &quot;Change config
              OVPN file&quot;, or tab <strong>Configurations</strong>.
            </div>
          )}

          <div className="header-containe">
            <div className="header-bar">
              <div className="left-buttons">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => navigate(`/servers/${parsedVpnServerId}/certificates`)}
                >
                  {FaArrowLeft({ className: "icon" })} Back
                </button>
              </div>
              <div className="right-buttons">
                <button type="button" className="btn secondary" onClick={handleSubmit}>
                  {FaPlus({ className: "icon" })} {vpnServerId ? "Update Config" : "Add Config"}
                </button>
              </div>
            </div>
          </div>

          {/* Load error is shown via toast; keep inline API error (from submit) if you want a static indicator */}
          {errors.apiError && <p className="error-message">{errors.apiError}</p>}

          <form className="server-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="VpnServerIp">VPN Server IP *</label>
              <input
                type="text"
                id="VpnServerIp"
                name="VpnServerIp"
                value={ovpnFileConfig.VpnServerIp}
                onChange={handleChange}
                className={errors.VpnServerIp ? "input-error" : ""}
                placeholder="Enter VPN Server IP"
              />
              {errors.VpnServerIp && <p className="error-message">{errors.VpnServerIp}</p>}
            </div>

            <div className="form-group">
              <label htmlFor="VpnServerPort">VPN Server Port *</label>
              <input
                type="number"
                id="VpnServerPort"
                name="VpnServerPort"
                value={ovpnFileConfig.VpnServerPort}
                onChange={handleChange}
                className={errors.VpnServerPort ? "input-error" : ""}
                placeholder="Enter VPN Server Port"
              />
              {errors.VpnServerPort && <p className="error-message">{errors.VpnServerPort}</p>}
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={autoDetectServerSettings}
                  onChange={(e) => setAutoDetectServerSettings(e.target.checked)}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Try auto-detect Port/Proto from latest server conflog</span>
                  <span className="checkbox-description">
                    When enabled, save uses detected values from server config ({detectedPort ?? "—"} / {serverProto ?? "—"}).
                  </span>
                </div>
              </label>
            </div>

            <div className="form-group">
              <div className="config-template-container">
                <div className="toolbar">
                  <span>{isXrayStack ? "VLESS export template" : "Config Template"}</span>
                  <button
                    className="copy-button"
                    type="button"
                    onClick={() => handleCopy(ovpnFileConfig.ConfigTemplate)}
                  >
                    {FaCopy({})} {copyStatus}
                  </button>
                </div>
                <div className="ovpn-textarea-wrap">
                  <pre
                    className="ovpn-highlight-pre"
                    aria-hidden
                    ref={highlightPreRef}
                  >
                    {highlightOvpnConfig(ovpnFileConfig.ConfigTemplate || " ")}
                  </pre>
                  <textarea
                    id="ConfigTemplate"
                    name="ConfigTemplate"
                    value={ovpnFileConfig.ConfigTemplate}
                    onChange={handleChange}
                    onScroll={() => {
                      if (highlightPreRef.current && textareaRef.current) {
                        highlightPreRef.current.scrollTop = textareaRef.current.scrollTop;
                        highlightPreRef.current.scrollLeft = textareaRef.current.scrollLeft;
                      }
                    }}
                    placeholder="Enter config template"
                    className="ovpn-textarea-overlay"
                    ref={textareaRef}
                  />
                </div>
              </div>
            </div>
          </form>

          <div className="form-hint-container">
            <h4>What are these settings?</h4>
            {isXrayStack ? (
              <>
                <p>
                  <strong>VPN Server IP / Port</strong> — public endpoint embedded in generated VLESS URIs and templates
                  (e.g. <code>{"{{server_ip}}"}</code>, <code>{"{{server_port}}"}</code>).
                </p>
                <h4>VLESS link template</h4>
                <p>
                  Use placeholders: <code>{"{{vless_uri}}"}</code>, <code>{"{{uuid}}"}</code>,{" "}
                  <code>{"{{friendly_name}}"}</code>, <code>{"{{server_ip}}"}</code>, <code>{"{{server_port}}"}</code>.
                  Include <code>{"{{vless_uri}}"}</code> to emit a shareable <code>vless://</code> line.
                </p>
              </>
            ) : (
              <>
                <p>
                  <strong>VPN Server IP</strong> — the public IP address or domain name of your OpenVPN server. This value
                  is inserted into the generated .ovpn configuration file, allowing clients to connect to the correct server.
                </p>
                <p>
                  <strong>VPN Server Port</strong> — the port your OpenVPN server is configured to listen on (usually{" "}
                  <code>1194</code>). This must match the <code>port</code> directive in your <code>server.conf</code> (or{" "}
                  <code>openvpn.conf</code>) file.
                </p>
                <p>⚠️ If the IP or port are incorrect, VPN clients will not be able to connect.</p>

                <h4>What is the OpenVPN Config Template?</h4>
                <p>
                  The <strong>Config Template</strong> defines how the generated <code>.ovpn</code> file will look. You can
                  include dynamic placeholders like <code>{"{{server_ip}}"}</code>, <code>{"{{client_cert}}"}</code>, etc.
                </p>
                <p>These placeholders will be replaced with actual values when generating client configs:</p>
                <pre className="ovpn-template-sample">{highlightOvpnConfig(SAMPLE_TEMPLATE)}</pre>
                <p>
                  ⚠️ Do not remove or change the placeholders unless you understand their purpose. Each one is automatically
                  replaced with correct values for the selected VPN server and user certificate.
                </p>
              </>
            )}
          </div>

          {parsedVpnServerId > 0 && openVpnPageEnabled ? (
            <div className="conflog-history-section">
              <h3 className="ovpn-config-section-title settings-card__h3-with-icon">
                <FaHistory className="icon" aria-hidden />
                <span>Conflog history</span>
              </h3>
              <p className="form-hint">
                History of fetched configuration logs for this server. Use &quot;Fetch and save&quot; to load the latest conflog from the server API.
              </p>

              {latestPayload && (
                <div className="conflog-summary-card">
                  <h4 className="conflog-summary-title">Server config (from latest conflog)</h4>
                  <dl className="conflog-summary-dl">
                    <div className="conflog-summary-row">
                      <dt>Application</dt>
                      <dd>{latestPayload.application ?? "—"}</dd>
                    </div>
                    <div className="conflog-summary-row">
                      <dt>Version</dt>
                      <dd>{latestPayload.version ?? "—"}</dd>
                    </div>
                    <div className="conflog-summary-row">
                      <dt>Subnet</dt>
                      <dd>{latestConfig?.vpnSubnet ?? "—"}</dd>
                    </div>
                    <div className="conflog-summary-row">
                      <dt>Mask</dt>
                      <dd>{latestConfig?.vpnNetmask ?? "—"}</dd>
                    </div>
                    <div className="conflog-summary-row">
                      <dt>Port</dt>
                      <dd>{latestConfig?.port ?? "—"}</dd>
                    </div>
                    <div className="conflog-summary-row">
                      <dt>Proto</dt>
                      <dd>{latestConfig?.proto ?? "—"}</dd>
                    </div>
                  </dl>
                </div>
              )}

              {configMismatch.length > 0 && (
                <div className="conflog-config-alert" role="alert">
                  <strong>Config mismatch:</strong> Values from the server (conflog) do not match the ones set in your config template.
                  <ul>
                    {configMismatch.map((msg, i) => (
                      <li key={i}>{msg}</li>
                    ))}
                  </ul>
                  Update the template (VPN Server Port, or <code>proto tcp</code> / <code>proto udp</code> in the template) to match the server.
                </div>
              )}

              <div className="conflog-actions">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => fetchAndSaveConflogMutation.mutate({ vpnServerId: parsedVpnServerId })}
                  disabled={fetchAndSaveConflogMutation.isPending}
                >
                  {fetchAndSaveConflogMutation.isPending ? (
                    <span className="api-check-spinner" aria-hidden />
                  ) : (
                    <FaSync className="icon" />
                  )}{" "}
                  {fetchAndSaveConflogMutation.isPending ? "Fetching…" : "Fetch and save conflog"}
                </button>
              </div>
              <CustomThemeProvider>
                <div
                  className="data-grid-wrap"
                  style={{ backgroundColor: "var(--bg-body)", padding: 10, borderRadius: 8 }}
                >
                  <StyledDataGrid
                    rows={conflogRows}
                    columns={conflogColumns}
                    pageSizeOptions={[5, 10, 20, 50, 100]}
                    paginationMode="server"
                    rowCount={conflogTotalCount}
                    paginationModel={{
                      page: conflogPage - 1,
                      pageSize: conflogPageSize,
                    }}
                    onPaginationModelChange={(model: GridPaginationModel) => {
                      setConflogPage(model.page + 1);
                      setConflogPageSize(model.pageSize ?? conflogPageSize);
                    }}
                    loading={isConflogLoading}
                    slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                    localeText={{
                      noRowsLabel: "No conflog history yet. Use \"Fetch and save conflog\" to load data.",
                    }}
                  />
                </div>
              </CustomThemeProvider>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default OvpnFileConfigForm;

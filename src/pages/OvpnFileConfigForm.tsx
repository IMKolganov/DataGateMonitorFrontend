// src/pages/OvpnFileConfigForm.tsx
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import "../css/OvpnFileConfigForm.css";
import { FaPlus, FaCopy, FaArrowLeft, FaSync } from "react-icons/fa";
import { toast } from "react-toastify";
import { useQueryClient } from "@tanstack/react-query";

import {
  useGetApiOpenVpnConfigsGetVpnServerId,
  usePostApiOpenVpnConfigsAddUpdate,
} from "../api/orval/open-vpn-server-ovpn-file-config/open-vpn-server-ovpn-file-config";

import {
  useGetApiOpenVpnServersConflogHistoryByServerVpnServerId,
  usePostApiOpenVpnServersConflogFetchAndSaveByServerVpnServerId,
  getGetApiOpenVpnServersConflogHistoryByServerVpnServerIdQueryKey,
} from "../api/orval/open-vpn-server-conflog/open-vpn-server-conflog";

import type {
  AddOrUpdateOvpnFileConfigRequest,
  OvpnFileConfigResponse,
  RootInfoResponse,
} from "../api/orval/model";
import type { GridColDef, GridPaginationModel } from "@mui/x-data-grid";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import "../css/Table.css";
import { highlightOvpnConfig } from "../utils/ovpnConfigHighlight";

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
  payload?: RootInfoResponse;
  createDate?: string;
}

function formatPayload(payload: RootInfoResponse | undefined | null): string {
  if (!payload) return "—";
  const parts: string[] = [];
  if (payload.version != null) parts.push(`v: ${payload.version}`);
  if (payload.application != null) parts.push(`app: ${payload.application}`);
  if (payload.environment != null) parts.push(`env: ${payload.environment}`);
  return parts.length > 0 ? parts.join(" | ") : JSON.stringify(payload);
}

const OvpnFileConfigForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { vpnServerId } = useParams<{ vpnServerId?: string }>();
  const parsedVpnServerId = Number(vpnServerId) || 0;
  const highlightPreRef = React.useRef<HTMLPreElement | null>(null);
  const textareaRef = React.useRef<HTMLTextAreaElement | null>(null);
  const [conflogPagination, setConflogPagination] = useState({ page: 1, pageSize: DEFAULT_CONFLOG_PAGE_SIZE });

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
        enabled: parsedVpnServerId > 0, // skip for "create new" w/o id
        staleTime: 0,
        retry: 1,
      },
    },
  );

  // mutation for save
  const saveMutation = usePostApiOpenVpnConfigsAddUpdate();

  const conflogHistoryParams = useMemo(
    () => ({ page: conflogPagination.page, pageSize: conflogPagination.pageSize }),
    [conflogPagination]
  );
  const { data: conflogHistoryResp, isFetching: isConflogLoading } =
    useGetApiOpenVpnServersConflogHistoryByServerVpnServerId(
      parsedVpnServerId,
      conflogHistoryParams,
      { query: { enabled: parsedVpnServerId > 0 } }
    );
  const conflogPageData = (conflogHistoryResp as { data?: { items?: ConflogRow[]; totalCount?: number } })?.data;
  const conflogItems: ConflogRow[] = conflogPageData?.items ?? [];
  const conflogTotalCount = conflogPageData?.totalCount ?? 0;

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

  const conflogRows = conflogItems.map((row, idx) => ({
    id: row.id ?? idx,
    requestUrl: row.requestUrl ?? "—",
    createDate: row.createDate ? new Date(row.createDate).toLocaleString() : "—",
    payload: formatPayload(row.payload),
  }));

  const conflogColumns: GridColDef[] = [
    { field: "id", headerName: "Id", width: 80 },
    { field: "requestUrl", headerName: "Request URL", flex: 1, minWidth: 150 },
    { field: "createDate", headerName: "Created", flex: 0.8, minWidth: 140 },
    { field: "payload", headerName: "Payload", flex: 1, minWidth: 180 },
  ];

  // small helper to extract readable error messages
  const getErrorMessage = (err: unknown): string => {
    const anyErr = err as any;
    const resp = anyErr?.response?.data ?? anyErr?.data ?? anyErr;
    if (resp) {
      if (typeof resp === "string") return resp;
      const msg = resp.message ?? resp.Message;
      const detail = resp.detail ?? resp.Detail;
      if (msg && detail) return `${msg} Details: ${detail}`;
      if (msg) return msg;
      if (detail) return detail;
    }
    return anyErr?.message ?? "Unknown error";
  };

  // when data arrives, map to local PascalCase state
  useEffect(() => {
    if (!data) return;
    setServerConfig((prev) => ({
      ...prev,
      Id: data.id ?? 0,
      VpnServerId: data.vpnServerId ?? parsedVpnServerId,
      VpnServerIp: data.vpnServerIp ?? "",
      VpnServerPort: Number(data.vpnServerPort ?? 1194),
      ConfigTemplate: data.configTemplate ?? "",
    }));
  }, [data, parsedVpnServerId]);

  // toast on load error (once per state change)
  useEffect(() => {
    if (isError) {
      toast.error(`Failed to load VPN server configuration: ${getErrorMessage(error)}`, {
        toastId: "ovpn-config-load-error",
      });
    }
  }, [isError, error]);

  const loading = useMemo(() => isFetching || saveMutation.isPending, [isFetching, saveMutation.isPending]);

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
    if (
      !ovpnFileConfig.VpnServerPort ||
      ovpnFileConfig.VpnServerPort < 1 ||
      ovpnFileConfig.VpnServerPort > 65535
    ) {
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

    const payload: AddOrUpdateOvpnFileConfigRequest = {
      vpnServerId: ovpnFileConfig.VpnServerId || parsedVpnServerId,
      vpnServerIp: ovpnFileConfig.VpnServerIp.trim(),
      vpnServerPort: ovpnFileConfig.VpnServerPort,
      configTemplate: ovpnFileConfig.ConfigTemplate,
    };

    try {
      await toast.promise(
        saveMutation.mutateAsync({ data: payload }),
        {
          pending: "Saving OpenVPN file config…",
          success: "OpenVPN file config saved",
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
            {vpnServerId ? "Edit OpenVPN File Config" : "Add New Ovpn File Config"}
          </h2>

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

            <div className="form-group">
              <div className="config-template-container">
                <div className="toolbar">
                  <span>Config Template</span>
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
            <p>
              <strong>VPN Server IP</strong> — the public IP address or domain name of your OpenVPN server. This value is
              inserted into the generated .ovpn configuration file, allowing clients to connect to the correct server.
            </p>
            <p>
              <strong>VPN Server Port</strong> — the port your OpenVPN server is configured to listen on (usually <code>1194</code>).
              This must match the <code>port</code> directive in your <code>server.conf</code> (or <code>openvpn.conf</code>) file.
            </p>
            <p>⚠️ If the IP or port are incorrect, VPN clients will not be able to connect.</p>

            <h4>What is the OpenVPN Config Template?</h4>
            <p>
              The <strong>Config Template</strong> defines how the generated <code>.ovpn</code> file will look.
              You can include dynamic placeholders like <code>{"{{server_ip}}"}</code>, <code>{"{{client_cert}}"}</code>, etc.
            </p>
            <p>These placeholders will be replaced with actual values when generating client configs:</p>
            <pre className="ovpn-template-sample">
              {highlightOvpnConfig(SAMPLE_TEMPLATE)}
            </pre>
            <p>
              ⚠️ Do not remove or change the placeholders unless you understand their purpose.
              Each one is automatically replaced with correct values for the selected VPN server and user certificate.
            </p>
          </div>

          {parsedVpnServerId > 0 && (
            <div className="conflog-history-section">
              <h3 className="ovpn-config-section-title">Conflog history</h3>
              <p className="form-hint">
                History of fetched configuration logs for this server. Use &quot;Fetch and save&quot; to load the latest conflog from the server API.
              </p>
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
                    pageSizeOptions={[5, 10, 20, 50]}
                    paginationMode="server"
                    rowCount={conflogTotalCount}
                    paginationModel={{
                      page: conflogPagination.page - 1,
                      pageSize: conflogPagination.pageSize,
                    }}
                    onPaginationModelChange={(model: GridPaginationModel) => {
                      setConflogPagination((p) => ({
                        page: model.page + 1,
                        pageSize: model.pageSize ?? p.pageSize,
                      }));
                    }}
                    loading={isConflogLoading}
                    slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
                    disableColumnFilter
                    disableColumnMenu
                    localeText={{
                      noRowsLabel: "No conflog history yet. Use \"Fetch and save conflog\" to load data.",
                    }}
                  />
                </div>
              </CustomThemeProvider>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OvpnFileConfigForm;

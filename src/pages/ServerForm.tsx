// src/pages/ServerForm.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import "../css/OvpnFileConfigForm.css";
import { FaArrowLeft, FaPlus, FaCopy, FaCheckCircle } from "react-icons/fa";
import { toast } from "react-toastify";

import {
  useGetApiOpenVpnServersGetVpnServerId,
  usePostApiOpenVpnServersAdd,
  usePutApiOpenVpnServersUpdate,
  getApiOpenVpnServersGetVpnServerId,
  getApiOpenVpnServersGetMicroserviceInfoByUrl,
} from "../api/orval/open-vpn-servers/open-vpn-servers";

import {
  useGetApiOpenVpnConfigsGetVpnServerId,
  usePostApiOpenVpnConfigsAddUpdate,
} from "../api/orval/open-vpn-server-ovpn-file-config/open-vpn-server-ovpn-file-config";

import { useGetApiTagsGetAll } from "../api/orval/tags/tags";

import type {
  AddServerRequest,
  UpdateServerRequest,
  OpenVpnServerDto,
  OvpnFileConfigResponse,
} from "../api/orval/model";
import { highlightOvpnConfig } from "../utils/ovpnConfigHighlight";

type GetByIdResult = Awaited<ReturnType<typeof getApiOpenVpnServersGetVpnServerId>>;

function unwrapServerDto(raw: GetByIdResult | undefined): OpenVpnServerDto | null {
  if (!raw) return null;

  const top: any = raw;
  const s: any = top?.openVpnServer ?? top?.data?.openVpnServer ?? top;

  if (!s || typeof s !== "object") return null;

  const dto: OpenVpnServerDto = {
    id: typeof s.id === "number" ? s.id : s.id != null ? Number(s.id) : undefined,
    serverName: s.serverName ?? null,
    isOnline: Boolean(s.isOnline ?? false),
    isDefault: Boolean(s.isDefault ?? false),
    apiUrl: s.apiUrl ?? null,
    latitude: s.latitude ?? null,
    longitude: s.longitude ?? null,
    isEnableWss: Boolean(s.isEnableWss ?? false),
    createDate: s.createDate,
    lastUpdate: s.lastUpdate,
    tags: Array.isArray(s.tags) ? s.tags : s.tags ?? null,
  };

  return dto;
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const ServerForm: React.FC = () => {
  const navigate = useNavigate();
  const { serverId } = useParams<{ serverId?: string }>();
  const idNum = Number(serverId || 0);
  const highlightPreRef = React.useRef<HTMLPreElement | null>(null);
  const configTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const { data: serverResp, isFetching } = useGetApiOpenVpnServersGetVpnServerId(idNum, {
    query: { enabled: !!idNum },
  });

  const { data: ovpnConfigData } = useGetApiOpenVpnConfigsGetVpnServerId(idNum, {
    query: { enabled: idNum > 0 },
  });

  const { data: tagsResp } = useGetApiTagsGetAll();
  const allTags = React.useMemo(
    () => (tagsResp as { data?: { tags?: { id?: number; name?: string | null }[] | null } })?.data?.tags ?? [],
    [tagsResp]
  );

  const addMutation = usePostApiOpenVpnServersAdd();
  const updateMutation = usePutApiOpenVpnServersUpdate();
  const saveOvpnConfigMutation = usePostApiOpenVpnConfigsAddUpdate();

  const [serverData, setServerData] = React.useState<OpenVpnServerDto>({
    id: idNum || undefined,
    serverName: "",
    isOnline: false,
    isDefault: false,
    apiUrl: null,
    latitude: null,
    longitude: null,
    isEnableWss: false,
    createDate: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  });

  const [selectedTagIds, setSelectedTagIds] = React.useState<number[]>([]);

  const [ovpnConfig, setOvpnConfig] = React.useState({
    vpnServerIp: "",
    vpnServerPort: 1194,
    configTemplate: "",
  });

  const [copyStatus, setCopyStatus] = React.useState<"Copy" | "Copied!">("Copy");

  const [errors, setErrors] = React.useState<{
    serverName: string;
    vpnServerIp: string;
    vpnServerPort: string;
  }>({
    serverName: "",
    vpnServerIp: "",
    vpnServerPort: "",
  });

  type ApiCheckStatus = "idle" | "loading" | "success" | "error";
  const [apiCheck, setApiCheck] = React.useState<{
    status: ApiCheckStatus;
    data?: unknown;
    error?: string;
  }>({ status: "idle" });

  React.useEffect(() => {
    if (!serverResp) return;

    const dto = unwrapServerDto(serverResp);
    if (!dto) return;

    setServerData((prev) => ({
      ...prev,
      ...dto,
      id: dto.id ?? prev.id ?? (idNum || undefined),
      serverName: dto.serverName ?? "",
      apiUrl: dto.apiUrl ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      isOnline: dto.isOnline ?? false,
      isDefault: dto.isDefault ?? false,
      isEnableWss: dto.isEnableWss ?? false,
      lastUpdate: dto.lastUpdate ?? prev.lastUpdate,
      createDate: dto.createDate ?? prev.createDate,
    }));

    const tagNames = dto.tags ?? [];
    const ids =
      tagNames.length > 0 && allTags.length > 0
        ? allTags
            .filter((t) => t.name != null && tagNames.includes(t.name))
            .map((t) => t.id!)
            .filter((id): id is number => typeof id === "number")
        : [];
    setSelectedTagIds(ids);
  }, [serverResp, idNum, allTags]);

  React.useEffect(() => {
    const raw = (ovpnConfigData as { data?: OvpnFileConfigResponse })?.data ?? ovpnConfigData;
    if (!raw || typeof raw !== "object") return;
    setOvpnConfig((prev) => ({
      ...prev,
      vpnServerIp: raw.vpnServerIp ?? "",
      vpnServerPort: Number(raw.vpnServerPort ?? 1194),
      configTemplate: raw.configTemplate ?? "",
    }));
  }, [ovpnConfigData]);

  const validateForm = () => {
    let ok = true;
    const next = { serverName: "", vpnServerIp: "", vpnServerPort: "" };

    if (!String(serverData.serverName ?? "").trim()) {
      next.serverName = "Server name is required.";
      ok = false;
    }

    if (idNum > 0) {
      if (!String(ovpnConfig.vpnServerIp ?? "").trim()) {
        next.vpnServerIp = "VPN Server IP is required.";
        ok = false;
      }
      if (
        !ovpnConfig.vpnServerPort ||
        ovpnConfig.vpnServerPort < 1 ||
        ovpnConfig.vpnServerPort > 65535
      ) {
        next.vpnServerPort = "VPN Server Port must be between 1 and 65535.";
        ok = false;
      }
    }

    setErrors(next);
    return ok;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "serverName") {
      setServerData((p) => ({ ...p, serverName: value }));
      return;
    }

    if (name === "apiUrl") {
      setServerData((p) => ({ ...p, apiUrl: value.trim() ? value : null }));
      setApiCheck((prev) => (prev.status !== "idle" ? { status: "idle" } : prev));
      return;
    }

    if (name === "latitude") {
      setServerData((p) => ({ ...p, latitude: toNumberOrNull(value) }));
      return;
    }

    if (name === "longitude") {
      setServerData((p) => ({ ...p, longitude: toNumberOrNull(value) }));
      return;
    }

    if (name === "vpnServerIp") {
      setOvpnConfig((p) => ({ ...p, vpnServerIp: value }));
      return;
    }

    if (name === "vpnServerPort") {
      setOvpnConfig((p) => ({ ...p, vpnServerPort: Number(value) || 0 }));
      return;
    }

    if (name === "configTemplate") {
      setOvpnConfig((p) => ({ ...p, configTemplate: value }));
      return;
    }
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(ovpnConfig.configTemplate);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus("Copy"), 2000);
    } catch {
      toast.error("Failed to copy text");
      setCopyStatus("Copy");
    }
  };

  const handleCheckApiUrl = React.useCallback(async () => {
    const url = String(serverData.apiUrl ?? "").trim();
    if (!url) {
      toast.error("Enter API URL first");
      return;
    }
    let targetUrl = url;
    try {
      new URL(targetUrl);
    } catch {
      toast.error("Invalid URL");
      return;
    }
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }
    setApiCheck({ status: "loading" });
    try {
      const data = await getApiOpenVpnServersGetMicroserviceInfoByUrl({
        baseUrl: targetUrl,
      });
      setApiCheck({ status: "success", data });
      toast.success("Server responded successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err != null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Request failed";
      setApiCheck({ status: "error", error: msg });
      toast.error("Check failed: " + msg);
    }
  }, [serverData.apiUrl]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    if (name === "isDefault") {
      setServerData((p) => ({ ...p, isDefault: checked }));
      return;
    }

    if (name === "isOnline") {
      setServerData((p) => ({ ...p, isOnline: checked }));
      return;
    }

    if (name === "isEnableWss") {
      setServerData((p) => ({ ...p, isEnableWss: checked }));
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (idNum) {
        const payload: UpdateServerRequest = {
          id: Number(serverData.id ?? idNum),
          serverName: String(serverData.serverName ?? "").trim(),
          apiUrl: serverData.apiUrl ?? null,
          isDefault: serverData.isDefault ?? false,
          isOnline: serverData.isOnline ?? false,
          latitude: serverData.latitude ?? null,
          longitude: serverData.longitude ?? null,
          isEnableWss: serverData.isEnableWss ?? false,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : null,
        };

        await updateMutation.mutateAsync({ data: payload });

        await saveOvpnConfigMutation.mutateAsync({
          data: {
            vpnServerId: idNum,
            vpnServerIp: String(ovpnConfig.vpnServerIp ?? "").trim(),
            vpnServerPort: ovpnConfig.vpnServerPort || 1194,
            configTemplate: ovpnConfig.configTemplate || null,
          },
        });

        toast.success("Server and OpenVPN config updated successfully!");
      } else {
        const payload: AddServerRequest = {
          serverName: String(serverData.serverName ?? "").trim(),
          apiUrl: serverData.apiUrl ?? null,
          isDefault: serverData.isDefault ?? false,
          isOnline: serverData.isOnline ?? false,
          latitude: serverData.latitude ?? null,
          longitude: serverData.longitude ?? null,
          isEnableWss: serverData.isEnableWss ?? false,
          tagIds: selectedTagIds.length > 0 ? selectedTagIds : null,
        };

        await addMutation.mutateAsync({ data: payload });
        toast.success("Server added successfully!");
      }

      navigate("/");
    } catch (err: any) {
      const base = idNum ? "Failed to update server." : "Failed to add server.";
      const apiMsg = err?.response?.data?.Message || err?.message || base;
      toast.error(apiMsg);
    }
  };

  return (
      <div className="content-wrapper wide-table">
        <div className="server-form-container">
          <h2 className="server-form-header">{idNum ? "Edit Server" : "Add New Server"}</h2>

          <form className="server-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="ServerName">Server Name *</label>
              <input
                  type="text"
                  id="ServerName"
                  name="serverName"
                  value={String(serverData.serverName ?? "")}
                  onChange={handleTextChange}
                  className={errors.serverName ? "input-error" : ""}
                  placeholder="Enter server name"
                  disabled={isFetching}
              />
              {errors.serverName && <p className="error-message">{errors.serverName}</p>}
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isDefault"
                    checked={Boolean(serverData.isDefault)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Default Server</span>
                  <span className="checkbox-description">
                  Mark this server as the default entry point for clients.
                </span>
                </div>
              </label>
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isOnline"
                    checked={Boolean(serverData.isOnline)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Online</span>
                  <span className="checkbox-description">Show this server as online.</span>
                </div>
              </label>
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isEnableWss"
                    checked={Boolean(serverData.isEnableWss)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Enable WSS</span>
                  <span className="checkbox-description">Allow WSS transport for this server.</span>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="ApiUrl">API url</label>
              <div className="api-url-row">
                <input
                  type="text"
                  id="ApiUrl"
                  name="apiUrl"
                  value={serverData.apiUrl ?? ""}
                  onChange={handleTextChange}
                  placeholder="e.g. http://95.111.204.102:4009/"
                  disabled={isFetching}
                />
                <button
                  type="button"
                  className="btn secondary api-check-btn"
                  onClick={handleCheckApiUrl}
                  disabled={isFetching || !String(serverData.apiUrl ?? "").trim() || apiCheck.status === "loading"}
                  title="Send GET request to the URL and show microservice response"
                >
                  {apiCheck.status === "loading" ? (
                    <span className="api-check-spinner" aria-hidden />
                  ) : (
                    FaCheckCircle({ className: "icon" })
                  )}{" "}
                  {apiCheck.status === "loading" ? "Checking…" : "Check server"}
                </button>
              </div>
              {apiCheck.status === "success" && apiCheck.data != null && (
                <div className="api-check-result api-check-success">
                  <div className="api-check-summary">
                    {typeof (apiCheck.data as any)?.version === "string" && (
                      <span><strong>Version:</strong> {(apiCheck.data as any).version}</span>
                    )}
                    {typeof (apiCheck.data as any)?.application === "string" && (
                      <span><strong>Application:</strong> {(apiCheck.data as any).application}</span>
                    )}
                    {typeof (apiCheck.data as any)?.config === "object" && (apiCheck.data as any).config != null && (
                      <>
                        {(apiCheck.data as any).config.port != null && (
                          <span><strong>Port:</strong> {(apiCheck.data as any).config.port}</span>
                        )}
                        {(apiCheck.data as any).config.proto != null && (
                          <span><strong>Proto:</strong> {(apiCheck.data as any).config.proto}</span>
                        )}
                      </>
                    )}
                  </div>
                  <pre className="api-check-json">
                    {JSON.stringify(apiCheck.data, null, 2)}
                  </pre>
                </div>
              )}
              {apiCheck.status === "error" && apiCheck.error && (
                <div className="api-check-result api-check-error">
                  <strong>Error:</strong> {apiCheck.error}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="Latitude">Latitude</label>
              <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  id="Latitude"
                  name="latitude"
                  value={serverData.latitude ?? ""}
                  onChange={handleTextChange}
                  placeholder="Enter latitude (optional)"
                  disabled={isFetching}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Longitude">Longitude</label>
              <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  id="Longitude"
                  name="longitude"
                  value={serverData.longitude ?? ""}
                  onChange={handleTextChange}
                  placeholder="Enter longitude (optional)"
                  disabled={isFetching}
              />
            </div>

            <div className="form-group">
              <label>Tags</label>
              <div className="tags-checkbox-list">
                {allTags.length === 0 ? (
                  <span className="form-hint">No tags available. Create tags in settings to assign to servers.</span>
                ) : (
                  allTags.map((tag) => (
                    <label key={tag.id ?? tag.name ?? Math.random()} className="checkbox-label tags-checkbox-item">
                      <input
                        type="checkbox"
                        checked={selectedTagIds.includes(tag.id!)}
                        onChange={() => {
                          setSelectedTagIds((prev) =>
                            prev.includes(tag.id!)
                              ? prev.filter((id) => id !== tag.id)
                              : [...prev, tag.id!]
                          );
                        }}
                        disabled={isFetching}
                      />
                      <span className="checkbox-content">{tag.name ?? ""}</span>
                    </label>
                  ))
                )}
              </div>
            </div>

            {idNum > 0 && (
              <>
                <h3 className="ovpn-config-section-title">OpenVPN file config</h3>
                <div className="form-group">
                  <label htmlFor="VpnServerIp">VPN Server IP *</label>
                  <input
                    type="text"
                    id="VpnServerIp"
                    name="vpnServerIp"
                    value={ovpnConfig.vpnServerIp}
                    onChange={handleTextChange}
                    className={errors.vpnServerIp ? "input-error" : ""}
                    placeholder="Enter VPN Server IP"
                    disabled={isFetching}
                  />
                  {errors.vpnServerIp && <p className="error-message">{errors.vpnServerIp}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="VpnServerPort">VPN Server Port *</label>
                  <input
                    type="number"
                    id="VpnServerPort"
                    name="vpnServerPort"
                    value={ovpnConfig.vpnServerPort}
                    onChange={handleTextChange}
                    className={errors.vpnServerPort ? "input-error" : ""}
                    placeholder="1194"
                    disabled={isFetching}
                  />
                  {errors.vpnServerPort && <p className="error-message">{errors.vpnServerPort}</p>}
                </div>

                <div className="form-group">
                  <div className="config-template-container">
                    <div className="toolbar">
                      <span>Config Template</span>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={handleCopyConfig}
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
                        {highlightOvpnConfig(ovpnConfig.configTemplate || " ")}
                      </pre>
                      <textarea
                        id="ConfigTemplate"
                        name="configTemplate"
                        value={ovpnConfig.configTemplate}
                        onChange={handleTextChange}
                        onScroll={() => {
                          if (highlightPreRef.current && configTextareaRef.current) {
                            highlightPreRef.current.scrollTop = configTextareaRef.current.scrollTop;
                            highlightPreRef.current.scrollLeft = configTextareaRef.current.scrollLeft;
                          }
                        }}
                        placeholder="OpenVPN config template with {{server_ip}}, {{client_cert}}, etc."
                        className="ovpn-textarea-overlay"
                        ref={configTextareaRef}
                        disabled={isFetching}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            <div className="header-containe">
              <div className="header-bar">
                <div className="left-buttons">
                  <button type="button" className="btn secondary" onClick={() => navigate(`/`)}>
                    {FaArrowLeft({ className: "icon" })} Back
                  </button>
                </div>
                <div className="right-buttons">
                  <button
                      type="submit"
                      className="btn primary"
                      disabled={addMutation.isPending || updateMutation.isPending || saveOvpnConfigMutation.isPending}
                  >
                    {FaPlus({ className: "icon" })} {idNum ? "Update Server" : "Add Server"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
  );
};

export default ServerForm;
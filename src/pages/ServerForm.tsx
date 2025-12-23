// src/pages/ServerForm.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";

import {
  useGetApiOpenVpnServersGetVpnServerId,
  usePostApiOpenVpnServersAdd,
  usePutApiOpenVpnServersUpdate,
  getApiOpenVpnServersGetVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";

import type {
  AddServerRequest,
  UpdateServerRequest,
  OpenVpnServerDto,
} from "../api/orval/model";

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

  const { data: serverResp, isFetching } = useGetApiOpenVpnServersGetVpnServerId(idNum, {
    query: { enabled: !!idNum },
  });

  const addMutation = usePostApiOpenVpnServersAdd();
  const updateMutation = usePutApiOpenVpnServersUpdate();

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

  const [errors, setErrors] = React.useState<{ serverName: string }>({
    serverName: "",
  });

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
  }, [serverResp, idNum]);

  const validateForm = () => {
    let ok = true;
    const next = { serverName: "" };

    if (!String(serverData.serverName ?? "").trim()) {
      next.serverName = "Server name is required.";
      ok = false;
    }

    setErrors(next);
    return ok;
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "serverName") {
      setServerData((p) => ({ ...p, serverName: value }));
      return;
    }

    if (name === "apiUrl") {
      setServerData((p) => ({ ...p, apiUrl: value.trim() ? value : null }));
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
  };

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
        };

        await updateMutation.mutateAsync({ data: payload });
        toast.success("Server updated successfully!");
      } else {
        const payload: AddServerRequest = {
          serverName: String(serverData.serverName ?? "").trim(),
          apiUrl: serverData.apiUrl ?? null,
          isDefault: serverData.isDefault ?? false,
          isOnline: serverData.isOnline ?? false,
          latitude: serverData.latitude ?? null,
          longitude: serverData.longitude ?? null,
          isEnableWss: serverData.isEnableWss ?? false,
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
              <input
                  type="text"
                  id="ApiUrl"
                  name="apiUrl"
                  value={serverData.apiUrl ?? ""}
                  onChange={handleTextChange}
                  placeholder="Enter API url (optional)"
                  disabled={isFetching}
              />
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
                      className="submit-button"
                      disabled={addMutation.isPending || updateMutation.isPending}
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
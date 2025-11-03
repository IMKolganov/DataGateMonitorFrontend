// src/pages/ServerForm.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import { FaArrowLeft, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";

// orval-generated hooks & models
import {
  useGetApiOpenVpnServersGetVpnServerId,
  usePostApiOpenVpnServersAdd,
  usePutApiOpenVpnServersUpdate,
  getApiOpenVpnServersGetVpnServerId,
} from "../api/orval/open-vpn-servers/open-vpn-servers";
import type {
  AddServerRequest,
  UpdateServerRequest,
} from "../api/orval/model";

// Shape we keep locally for the form
type FormState = {
  id: number;
  serverName: string;
  isOnline: boolean;
  isDefault: boolean;
  apiUrl: string;
  lastUpdate?: string | null;
  createDate?: string | null;
};

// Safely extract the server object from a few possible shapes
function unwrapServer(raw: Awaited<ReturnType<typeof getApiOpenVpnServersGetVpnServerId>> | undefined): Partial<FormState> {
  if (!raw) return {};
  const top: any = raw;

  // Common cases:
  // 1) { openVpnServer: {...} }
  // 2) { data: { openVpnServer: {...} } } — if something re-wraps
  // 3) server fields directly on top level
  const s =
    top?.openVpnServer ??
    top?.data?.openVpnServer ??
    top;

  return {
    id: Number(s?.id ?? 0),
    serverName: String(s?.serverName ?? ""),
    isOnline: Boolean(s?.isOnline ?? false),
    isDefault: Boolean(s?.isDefault ?? false),
    apiUrl: String(s?.apiUrl ?? ""),
    lastUpdate: s?.lastUpdate ?? null,
    createDate: s?.createDate ?? null,
  };
}

const ServerForm: React.FC = () => {
  const navigate = useNavigate();
  const { serverId } = useParams<{ serverId?: string }>();
  const idNum = Number(serverId || 0);

  // Load server when editing
  const { data: serverResp, isFetching } = useGetApiOpenVpnServersGetVpnServerId(
    idNum,
    {
      query: {
        enabled: !!idNum,
      },
    }
  );

  // Local state
  const [serverData, setServerData] = React.useState<FormState>({
    id: idNum || 0,
    serverName: "",
    isOnline: false,
    isDefault: false,
    apiUrl: "",
    lastUpdate: new Date().toISOString(),
    createDate: new Date().toISOString(),
  });

  const [errors, setErrors] = React.useState<{ serverName: string }>({
    serverName: "",
  });

  // Sync incoming data into the form
  React.useEffect(() => {
    if (!serverResp) return;
    const s = unwrapServer(serverResp);

    setServerData((prev) => ({
      ...prev,
      id: Number(s.id ?? prev.id),
      serverName: s.serverName ?? "",
      isOnline: !!s.isOnline,
      isDefault: !!s.isDefault,
      apiUrl: s.apiUrl ?? "",
      lastUpdate: s.lastUpdate ?? prev.lastUpdate,
      createDate: s.createDate ?? prev.createDate,
    }));
  }, [serverResp]);

  // Mutations
  const addMutation = usePostApiOpenVpnServersAdd();
  const updateMutation = usePutApiOpenVpnServersUpdate();

  // Handlers
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;

    if (name === "serverName") {
      setServerData((p) => ({ ...p, serverName: value }));
    } else if (name === "apiUrl") {
      setServerData((p) => ({ ...p, apiUrl: value }));
    }
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    if (name === "isDefault") {
      setServerData((p) => ({ ...p, isDefault: checked }));
    }
  };

  const validateForm = () => {
    let ok = true;
    const next = { serverName: "" as string };

    if (!serverData.serverName.trim()) {
      next.serverName = "Server name is required.";
      ok = false;
    }

    setErrors(next);
    return ok;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      if (idNum) {
        // Update existing
        const payload: UpdateServerRequest = {
          id: serverData.id,
          serverName: serverData.serverName,
          apiUrl: serverData.apiUrl || "",
          isDefault: serverData.isDefault,
        };
        await updateMutation.mutateAsync({ data: payload });
        toast.success("Server updated successfully!");
      } else {
        // Add new
        const payload: AddServerRequest = {
          serverName: serverData.serverName,
          apiUrl: serverData.apiUrl || "",
          isDefault: serverData.isDefault,
        };
        await addMutation.mutateAsync({ data: payload });
        toast.success("Server added successfully!");
      }

      navigate("/");
    } catch (err: any) {
      const base = idNum ? "Failed to update server." : "Failed to add server.";
      const apiMsg =
        err?.response?.data?.Message || err?.message || base;
      toast.error(apiMsg);
    }
  };

  return (
    <div className="content-wrapper wide-table">
      <div className="server-form-container">
        <h2 className="server-form-header">
          {idNum ? "Edit Server" : "Add New Server"}
        </h2>

        <form className="server-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="ServerName">Server Name *</label>
            <input
              type="text"
              id="ServerName"
              name="serverName"
              value={serverData.serverName}
              onChange={handleChange}
              className={errors.serverName ? "input-error" : ""}
              placeholder="Enter server name"
              disabled={isFetching}
            />
            {errors.serverName && (
              <p className="error-message">{errors.serverName}</p>
            )}
          </div>

          <div className="form-group checkbox-container">
            <label className="checkbox-label">
              <input
                type="checkbox"
                name="isDefault"
                checked={serverData.isDefault}
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

          <div className="form-group">
            <label htmlFor="ApiUrl">API url</label>
            <input
              type="text"
              id="ApiUrl"
              name="apiUrl"
              value={serverData.apiUrl}
              onChange={handleChange}
              placeholder="Enter API url (optional)"
              disabled={isFetching}
            />
          </div>

          <div className="header-containe">
            <div className="header-bar">
              <div className="left-buttons">
                <button
                  type="button"
                  className="btn secondary"
                  onClick={() => navigate(`/`)}
                >
                  {FaArrowLeft({ className: "icon" })} Back
                </button>
              </div>
              <div className="right-buttons">
                <button
                  type="submit"
                  className="submit-button"
                  disabled={addMutation.isPending || updateMutation.isPending}
                >
                  {FaPlus({ className: "icon" })}{" "}
                  {idNum ? "Update Server" : "Add Server"}
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

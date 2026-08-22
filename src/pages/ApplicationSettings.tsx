// src/pages/ApplicationSettings.tsx
import { useMemo, useState } from "react";
import { FaCopy, FaLaptopCode, FaPlus, FaSync, FaTerminal } from "react-icons/fa";
import "../css/ApplicationSettings.css";
import "../css/Settings.css";
import ApplicationTable from "../components/settings/ApplicationTable.tsx";
import { GridFilterBar } from "../components/ui/GridFilterBar.tsx";
import { gridFilterFields } from "../config/gridFilters.ts";
import { useGridFilters } from "../hooks/useGridFilterStub.ts";

import {
  useGetApiApplicationsGetAll,
  usePostApiApplicationsRegister,
} from "../api/orval/applications/applications";
import type { GetApiApplicationsGetAllParams } from "../api/orval/model/getApiApplicationsGetAllParams";
import type { RegisterApplicationRequest, ApplicationDto } from "../api/orvalModelShim";
import type { ApplicationsResponsesRegisterApplicationResponse } from "../api/orval/model/applicationsResponsesRegisterApplicationResponse";
import axios from "axios";
import { errorMessage as formatError } from "../utils/errorMessage";

type CreatedClientCredentials = {
  name: string;
  clientId: string;
  clientSecret: string;
};

function extractApps(raw: unknown): ApplicationDto[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw as ApplicationDto[];

  const obj = raw as Record<string, unknown>;
  const data = obj["data"] as Record<string, unknown> | undefined;
  const candidates = [
    obj["applications"],
    obj["application"],
    data?.["applications"],
    data?.["application"],
  ];

  for (const c of candidates) {
    if (Array.isArray(c)) return c as ApplicationDto[];
  }

  return [];
}

function asCreatedClient(raw: unknown): CreatedClientCredentials | null {
  if (!raw || typeof raw !== "object") return null;
  const res = raw as ApplicationsResponsesRegisterApplicationResponse;
  const clientId = res.clientId?.trim();
  const clientSecret = res.clientSecret?.trim();
  if (!clientId || !clientSecret) return null;

  return {
    name: res.name?.trim() || "API client",
    clientId,
    clientSecret,
  };
}

export function ApplicationSettings() {
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [newAppName, setNewAppName] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [createdClient, setCreatedClient] = useState<CreatedClientCredentials | null>(null);
  const [copiedField, setCopiedField] = useState<"clientId" | "clientSecret" | null>(null);
  const appFilters = useGridFilters("settings-applications");

  const listParams = useMemo<GetApiApplicationsGetAllParams>(
    () => ({ ...appFilters.queryParams }),
    [appFilters.queryParams],
  );

  const {
    data: appsResp,
    error: appsError,
    isLoading,
    isFetching,
    refetch,
  } = useGetApiApplicationsGetAll(listParams, {
    query: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });

  const registerMutation = usePostApiApplicationsRegister();

  const apps = useMemo(() => extractApps(appsResp), [appsResp]);
  const errorMessage =
    registerError ??
    (appsError ? (appsError as Error).message || "Failed to load API clients" : null);

  const loading = isLoading;
  const spinner = refreshing || isFetching || registerMutation.isPending;

  const apiTokenUrl =
    typeof window !== "undefined" ? `${window.location.origin}/api/auth/token` : "/api/auth/token";

  const handleCopy = async (text: string, field: "clientId" | "clientSecret") => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleRegister = async () => {
    const name = newAppName.trim();
    if (!name) return;

    setRegisterError(null);
    try {
      const body: RegisterApplicationRequest = { name };
      const res = await registerMutation.mutateAsync({ data: body });
      const created = asCreatedClient(res);

      if (!created) {
        throw new Error("Invalid response from server");
      }

      setCreatedClient(created);
      setNewAppName("");
      await refetch();
    } catch (e: unknown) {
      let msg = "Failed to create API client";
      if (axios.isAxiosError(e)) {
        const d = e.response?.data;
        if (d && typeof d === "object" && d !== null) {
          const r = d as Record<string, unknown>;
          const err = r["message"] ?? r["error"];
          if (typeof err === "string") msg = err;
        } else if (e.message) msg = e.message;
      } else {
        msg = formatError(e) || msg;
      }
      setRegisterError(msg);
    }
  };

  const handleRefresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    setRegisterError(null);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaLaptopCode className="icon" aria-hidden />
        <span>API Clients</span>
      </h2>
      <div className="settings-divider" />

      <p className="app-settings-description">
        Create and manage machine-to-machine API clients. Each client receives a unique{" "}
        <strong>Client ID</strong> and <strong>Client Secret</strong> for authenticating API requests.
      </p>

      <div className="header-bar">
        <div className="left-buttons">
          <button className="btn secondary" onClick={handleRefresh} disabled={spinner}>
            {FaSync({ className: `icon ${spinner ? "icon-spin" : ""}` })} Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading API clients...</p>
        </div>
      ) : (
        <>
          <div className="app-register">
            <input
              id="application-register-name"
              name="applicationName"
              type="text"
              placeholder="Client name"
              value={newAppName}
              onChange={(e) => setNewAppName(e.target.value)}
              disabled={spinner}
              className="input"
            />
            <button
              className="btn primary"
              onClick={handleRegister}
              disabled={spinner || !newAppName.trim()}
            >
              {FaPlus({ className: "icon" })} Create client
            </button>
          </div>

          {errorMessage && (
            <div>
              <p className="error-message">❌ {errorMessage}</p>
            </div>
          )}

          <GridFilterBar
            gridId="settings-applications"
            fields={gridFilterFields("settings-applications")}
            values={appFilters.values}
            onChange={appFilters.onChange}
            onApply={appFilters.onApply}
            onReset={appFilters.onReset}
            disabled={isLoading || isFetching}
          />

          <ApplicationTable applications={apps} refreshApps={handleRefresh} />
        </>
      )}

      <div className="app-warning">
        <p>
          ⚠️ <strong>Security notice:</strong> The client secret is shown only once after creation.
          Store it securely — it cannot be retrieved later.
        </p>
      </div>

      <h3 className="settings-card__h3-with-icon">
        <FaTerminal className="icon" aria-hidden />
        <span>Example: obtain an API token</span>
      </h3>
      <pre className="code-block">
{`curl -X POST ${apiTokenUrl} \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }'

# Response (wrapped):
# { "success": true, "data": { "token": "...", "expiration": "..." } }`}
      </pre>

      {createdClient && (
        <div className="modal-overlay" onClick={() => setCreatedClient(null)}>
          <div
            className="modal-content api-client-created-modal"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-labelledby="api-client-created-title"
            aria-modal="true"
          >
            <div className="modal-header">
              <h3 id="api-client-created-title">API client created</h3>
              <button
                type="button"
                className="modal-close"
                onClick={() => setCreatedClient(null)}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="modal-body">
              <p className="api-client-created-modal__intro">
                Copy the credentials for <strong>{createdClient.name}</strong> now. The secret will not
                be shown again.
              </p>

              <div className="api-client-created-modal__field">
                <span className="api-client-created-modal__label">Client ID</span>
                <div className="api-client-created-modal__value-row">
                  <code className="api-client-created-modal__value">{createdClient.clientId}</code>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => handleCopy(createdClient.clientId, "clientId")}
                  >
                    <FaCopy className="icon" aria-hidden /> Copy
                  </button>
                  {copiedField === "clientId" && (
                    <span className="copied-text">✔ Copied!</span>
                  )}
                </div>
              </div>

              <div className="api-client-created-modal__field">
                <span className="api-client-created-modal__label">Client Secret</span>
                <div className="api-client-created-modal__value-row">
                  <code className="api-client-created-modal__value">{createdClient.clientSecret}</code>
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => handleCopy(createdClient.clientSecret, "clientSecret")}
                  >
                    <FaCopy className="icon" aria-hidden /> Copy
                  </button>
                  {copiedField === "clientSecret" && (
                    <span className="copied-text">✔ Copied!</span>
                  )}
                </div>
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn primary" onClick={() => setCreatedClient(null)}>
                I saved the secret
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ApplicationSettings;

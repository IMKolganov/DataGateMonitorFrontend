// src/pages/ApplicationSettings.tsx
import { useMemo, useState } from "react";
import { FaLaptopCode, FaPlus, FaSync, FaTerminal } from "react-icons/fa";
import "../css/ApplicationSettings.css";
import "../css/Settings.css";
import ApplicationTable from "../components/settings/ApplicationTable.tsx";

import {
  useGetApiApplicationsGetAll,
  usePostApiApplicationsRegister,
} from "../api/orval/applications/applications";
import type { RegisterApplicationRequest, ApplicationDto } from "../api/orvalModelShim";
import axios from "axios";
import { errorMessage as formatError } from "../utils/errorMessage";

// Normalizes different API response shapes into ApplicationDto[]
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

  const firstArray = Object.values(obj).find((v): v is unknown[] => Array.isArray(v));
  if (firstArray) return firstArray as ApplicationDto[];

  return [];
}

export function ApplicationSettings() {
  const [appsOverlay, setAppsOverlay] = useState<ApplicationDto[] | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [newAppName, setNewAppName] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: appsResp,
    error: appsError,
    isLoading,
    isFetching,
    refetch,
  } = useGetApiApplicationsGetAll({
    query: {
      staleTime: 0,
      gcTime: 5 * 60 * 1000,
    },
  });

  const registerMutation = usePostApiApplicationsRegister();

  const appsFromServer = useMemo(() => extractApps(appsResp), [appsResp]);
  const [appsSource, setAppsSource] = useState(appsResp);
  if (appsResp !== appsSource) {
    setAppsSource(appsResp);
    setAppsOverlay(null);
  }
  const apps = appsOverlay ?? appsFromServer;
  const errorMessage =
    registerError ??
    (appsError ? (appsError as Error).message || "Failed to load applications" : null);

  const loading = isLoading;
  const spinner = refreshing || isFetching || registerMutation.isPending;

  const handleRegister = async () => {
    const name = newAppName.trim();
    if (!name) return;

    setRegisterError(null);
    try {
      const body: RegisterApplicationRequest = { name };
      const res = await registerMutation.mutateAsync({ data: body });

      const createdList = extractApps(res);
      const resRec = res && typeof res === "object" && res !== null ? (res as Record<string, unknown>) : null;
      const single =
        resRec && !Array.isArray(res) ? resRec["application"] : undefined;
      const created =
        createdList[0] ??
        (Array.isArray(single) ? single[0] : single) ??
        (Array.isArray(res) ? res[0] : res);

      if (!created || typeof created !== "object" || !("clientId" in created) || !created.clientId) {
        throw new Error("Invalid response from server");
      }

      setAppsOverlay([...appsFromServer, created as ApplicationDto]);
      setNewAppName("");
      await refetch();
    } catch (e: unknown) {
      let msg = "Failed to register application";
      if (axios.isAxiosError(e)) {
        const d = e.response?.data;
        if (d && typeof d === "object" && d !== null) {
          const r = d as Record<string, unknown>;
          const err = r["error"] ?? r["message"];
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
        <span>Application Settings</span>
      </h2>
      <div className="settings-divider" />

      <p className="app-settings-description">
        Manage applications that require API access. Each registered application receives a unique{" "}
        <strong>Client ID</strong> and <strong>Client Secret</strong>. These credentials can be used to
        authenticate API requests.
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
          <p>Loading applications...</p>
        </div>
      ) : (
        <>
          <div className="app-register">
            <input
              type="text"
              placeholder="Application Name"
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
              {FaPlus({ className: "icon" })} Register app
            </button>
          </div>

          {errorMessage && (
            <div>
              <p className="error-message">❌ {errorMessage}</p>
            </div>
          )}

          <ApplicationTable applications={apps} refreshApps={handleRefresh} />
        </>
      )}

      <div className="app-warning">
        <p>
          ⚠️ <strong>Security Notice:</strong> The <code>clientSecret</code> is displayed only once
          upon creation. Make sure to store it securely!
        </p>
      </div>

      <h3 className="settings-card__h3-with-icon">
        <FaTerminal className="icon" aria-hidden />
        <span>Example: Authenticate with API</span>
      </h3>
      <pre className="code-block">
{`curl -X POST https://api.example.com/auth/token \\
  -H "Content-Type: application/json" \\
  -d '{
    "clientId": "your-client-id",
    "clientSecret": "your-client-secret"
  }'`}
      </pre>
    </div>
  );
}

export default ApplicationSettings;
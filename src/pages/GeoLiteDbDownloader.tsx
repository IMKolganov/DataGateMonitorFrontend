// GeoLiteDbDownloader.tsx
import { useState, useEffect, useRef, useMemo } from "react";
import { FaDatabase } from "react-icons/fa";
import * as signalR from "@microsoft/signalr";
import { toast } from "react-toastify";
import type { GetVersionDatabaseResponse } from "../api/orvalModelShim";
import { getApiBaseUrl } from "../config/apiBase";
import { errorMessage } from "../utils/errorMessage";
import { getSignalRPreferredTransport } from "../utils/signalrTransport.ts";
import { ACCESS_TOKEN_KEY } from "../utils/const.ts";

import {
  useGetApiGeoLiteGetVerionDb,
  usePostApiGeoLiteUpdateDb,
} from "../api/orval/geo-lite/geo-lite";

type StepProgressPayload = {
  step: number;
  totalSteps: number;
  title: string;
  progress: number; // 0..100
};

/** Same prefix as REST (`/api/...`) and Vite proxy — not `/hubs/...` at site root. */
function buildGeoLiteHubConnection(): signalR.HubConnection {
  const hubUrl = `${getApiBaseUrl()}/hubs/geolite`;
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => localStorage.getItem(ACCESS_TOKEN_KEY) ?? "",
      transport: getSignalRPreferredTransport(),
    })
    .withAutomaticReconnect()
    .build();
}

export function GeoLiteDbDownloader() {
  // Version loader (auto-unwrapped by ogmMutator in your setup)
  const {
    data: versionData,
    isLoading: isFetching,
    refetch: refetchVersion,
  } = useGetApiGeoLiteGetVerionDb<GetVersionDatabaseResponse>();

  const version = useMemo(
    () => versionData?.databaseVersion ?? "Unknown",
    [versionData]
  );

  // Update mutation
  const {
    mutateAsync: updateDbAsync,
    isPending: isUpdatingRequest,
  } = usePostApiGeoLiteUpdateDb({
    mutation: {
      onError: (err: unknown) => {
        toast.error(errorMessage(err));
      },
    },
  });

  // Local transient UI state (kept in refs to avoid re-renders during streaming)
  const updateRunningRef = useRef(false);
  const currentStepTitleRef = useRef<string | null>(null);
  const currentStepNumberRef = useRef<number | null>(null);
  const totalStepsRef = useRef<number | null>(null);
  const stepProgressRef = useRef<number | null>(null);

  // Simple force update hook
  const [, setTick] = useState(0);
  const forceRerender = () => setTick((x) => x + 1);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      try {
        // Create connection only once
        if (!connectionRef.current) {
          connectionRef.current = buildGeoLiteHubConnection();
        }
        const connection = connectionRef.current;

        // Ensure handlers are registered once
        connection?.off("GeoLiteStepProgress");
        connection?.off("GeoLiteUpdateFinished");

        connection?.on("GeoLiteStepProgress", (data: StepProgressPayload) => {
          // Update refs first (cheaper), then force a batched re-render
          currentStepNumberRef.current = data.step;
          totalStepsRef.current = data.totalSteps;
          currentStepTitleRef.current = data.title;
          stepProgressRef.current = data.progress;
          updateRunningRef.current = true;
          forceRerender();
        });

        connection?.on("GeoLiteUpdateFinished", async () => {
          updateRunningRef.current = false;
          currentStepTitleRef.current = null;
          currentStepNumberRef.current = null;
          totalStepsRef.current = null;
          stepProgressRef.current = null;
          forceRerender();

          try {
            await refetchVersion();
            toast.success("GeoLite database update completed.");
          } catch {
            toast.error("Update finished, but failed to load new version.");
          }
        });

        if (connection?.state !== signalR.HubConnectionState.Connected) {
          await connection.start();
        }

        connection.onclose(() => {
          // Reset running state when the socket closes
          updateRunningRef.current = false;
          forceRerender();
        });
      } catch (e) {
        if (!isMounted) return;
        console.error("[GeoLite] SignalR connect failed:", e);
      }
    };

    connect();

    return () => {
      isMounted = false;
      // Clean up handlers and stop connection
      const c = connectionRef.current;
      if (c) {
        c.off("GeoLiteStepProgress");
        c.off("GeoLiteUpdateFinished");
        c.stop().catch(() => {});
      }
    };
  }, [refetchVersion]);

  const handleUpdateGeoLite = async () => {
    try {
      await updateDbAsync();
      // Do not reset UI here; we wait for hub events to drive the UI.
    } catch {
      // Error is handled in mutation onError
    }
  };

  const updateInProgress = updateRunningRef.current || isUpdatingRequest;

  // Render
  if (isFetching) {
    return (
      <div
        className="geo-db-downloader"
        style={{ padding: "2rem", textAlign: "center" }}
      >
        <span
          className="spinner"
          style={{ width: 24, height: 24, display: "inline-block" }}
        />
        <p style={{ marginTop: "0.5rem", color: "#8b949e" }}>
          Loading status...
        </p>
      </div>
    );
  }

  const stepNo = currentStepNumberRef.current;
  const total = totalStepsRef.current;
  const title = currentStepTitleRef.current;
  const progress = stepProgressRef.current;

  return (
    <div className="geo-db-downloader" style={{ paddingTop: "1rem" }}>
      <h3 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.75rem" }}>
        GeoLite2 Downloader
      </h3>

      <p style={{ fontSize: "0.95rem", color: "var(--text-secondary)" }}>
        <span style={{ color: "#8b949e" }}>Current DB Version:</span>{" "}
        <strong style={{ color: "#58a6ff" }}>{version}</strong>
      </p>

      {stepNo !== null && title && (
        <div className="step-status" style={{ marginTop: "1rem", marginBottom: "1rem" }}>
          <div style={{ fontSize: "0.9rem", marginBottom: "0.5rem", color: "var(--text-secondary)" }}>
            <strong>
              Step {stepNo}/{total}:
            </strong>{" "}
            {title}
          </div>
          {progress !== null && (
            <div
              style={{
                width: "100%",
                height: "8px",
                backgroundColor: "var(--bg-content-alt)",
                borderRadius: "4px",
                overflow: "hidden",
                boxShadow: "inset 0 1px 2px rgba(0,0,0,0.1)",
              }}
            >
              <div
                style={{
                  width: `${progress}%`,
                  height: "100%",
                  backgroundColor: "#58a6ff",
                  transition: "width 0.3s ease-in-out",
                  marginBottom: "2px",
                }}
              />
            </div>
          )}
        </div>
      )}

      <button className="btn primary" onClick={handleUpdateGeoLite} disabled={updateInProgress}>
        {updateInProgress ? (
          <span className="spinner" style={{ marginRight: 8 }} />
        ) : (
          <FaDatabase className="icon" style={{ marginRight: 8 }} />
        )}
        {updateInProgress ? "Updating..." : "Update GeoLite2 Database"}
      </button>
    </div>
  );
}

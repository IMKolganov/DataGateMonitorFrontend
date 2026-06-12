// GeoLiteDbDownloader.tsx
import { useState, useEffect, useRef, useMemo, type CSSProperties } from "react";
import { FaDatabase } from "react-icons/fa";
import * as signalR from "@microsoft/signalr";
import { toast } from "react-toastify";
import type { GetVersionDatabaseResponse } from "../api/orvalModelShim";
import { getApiBaseUrl } from "../config/apiBase";
import { errorMessage } from "../utils/errorMessage";
import { getSignalRPreferredTransport } from "../utils/signalrTransport.ts";
import { resolveHubAccessToken } from "../utils/auth/signalRAccessToken.ts";
import "../css/GeoLiteDbDownloader.css";

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

type UpdateProgressState = {
  running: boolean;
  stepNo: number | null;
  totalSteps: number | null;
  title: string | null;
  progress: number | null;
};

const idleProgressState: UpdateProgressState = {
  running: false,
  stepNo: null,
  totalSteps: null,
  title: null,
  progress: null,
};

/** Same prefix as REST (`/api/...`) and Vite proxy — not `/hubs/...` at site root. */
function buildGeoLiteHubConnection(): signalR.HubConnection {
  const hubUrl = `${getApiBaseUrl()}/hubs/geolite`;
  return new signalR.HubConnectionBuilder()
    .withUrl(hubUrl, {
      accessTokenFactory: () => resolveHubAccessToken(),
      transport: getSignalRPreferredTransport(),
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.None)
    .build();
}

export function GeoLiteDbDownloader() {
  const {
    data: versionData,
    isLoading: isFetching,
    refetch: refetchVersion,
  } = useGetApiGeoLiteGetVerionDb<GetVersionDatabaseResponse>();

  const version = useMemo(
    () => versionData?.databaseVersion ?? "Unknown",
    [versionData],
  );

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

  const [updateProgress, setUpdateProgress] = useState<UpdateProgressState>(idleProgressState);

  const connectionRef = useRef<signalR.HubConnection | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = async () => {
      try {
        if (!connectionRef.current) {
          connectionRef.current = buildGeoLiteHubConnection();
        }
        const connection = connectionRef.current;

        connection?.off("GeoLiteStepProgress");
        connection?.off("GeoLiteUpdateFinished");

        connection?.on("GeoLiteStepProgress", (data: StepProgressPayload) => {
          setUpdateProgress({
            running: true,
            stepNo: data.step,
            totalSteps: data.totalSteps,
            title: data.title,
            progress: data.progress,
          });
        });

        connection?.on("GeoLiteUpdateFinished", async () => {
          setUpdateProgress(idleProgressState);

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
          setUpdateProgress(idleProgressState);
        });
      } catch (e) {
        if (!isMounted) return;
        console.error("[GeoLite] SignalR connect failed:", e);
      }
    };

    connect();

    return () => {
      isMounted = false;
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
    } catch {
      // Error is handled in mutation onError
    }
  };

  const updateInProgress = updateProgress.running || isUpdatingRequest;
  const { stepNo, totalSteps, title, progress } = updateProgress;

  const progressStyle =
    progress !== null
      ? ({ "--progress-pct": `${progress}%` } as CSSProperties)
      : undefined;

  if (isFetching) {
    return (
      <div className="geo-db-downloader geo-db-downloader--loading">
        <span className="spinner spinner--md" />
        <p className="loading-panel__hint">Loading status...</p>
      </div>
    );
  }

  return (
    <div className="geo-db-downloader">
      <h3 className="geo-db-downloader__title">GeoLite2 Downloader</h3>

      <p className="geo-db-downloader__version-line">
        <span className="geo-db-downloader__version-label">Current DB Version:</span>{" "}
        <strong className="geo-db-downloader__version-value">{version}</strong>
      </p>

      {stepNo !== null && title && (
        <div className="geo-db-downloader__step-status">
          <div className="geo-db-downloader__step-caption">
            <strong>
              Step {stepNo}/{totalSteps}:
            </strong>{" "}
            {title}
          </div>
          {progress !== null && (
            <div className="progress-bar">
              <div className="progress-bar__fill" style={progressStyle} />
            </div>
          )}
        </div>
      )}

      <button
        type="button"
        className="btn primary geo-db-downloader__update-btn"
        onClick={() => void handleUpdateGeoLite()}
        disabled={updateInProgress}
      >
        <FaDatabase className="icon-gap-end" />
        {updateInProgress ? "Updating..." : "Update GeoLite Database"}
      </button>
    </div>
  );
}

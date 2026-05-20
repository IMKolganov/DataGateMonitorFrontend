// src/components/GeoLiteDbSettings.tsx
import { useMemo, useState } from "react";
import { toast } from "react-toastify";
import "../css/Settings.css";
import { FaDatabase, FaSave } from "react-icons/fa";
import { GeoLiteDbDownloader } from "./GeoLiteDbDownloader";

// orval-generated imports
import {
  useGetApiSettingsGet,
  usePostApiSettingsSet,
} from "../api/orval/settings/settings";
import type {
  PostApiSettingsSetParams,
  SettingResponse,
  GetVersionDatabaseResponse,
} from "../api/orvalModelShim";

import { useGetApiGeoLiteGetVerionDb } from "../api/orval/geo-lite/geo-lite";
import axios from "axios";
import { axiosResponseDataMessage, errorMessage } from "../utils/errorMessage";

export function GeoLiteDbSettings() {
  const [geoIpAccountId, setGeoIpAccountId] = useState<string>("Fetching...");
  const [geoIpDbPath, setGeoIpDbPath] = useState<string>("Fetching...");
  const [geoIpDownloadUrl, setGeoIpDownloadUrl] = useState<string>("Fetching...");
  const [geoIpLicenseKey, setGeoIpLicenseKey] = useState<string>("Fetching...");
  const [geoIpAutoUpdateIntervalDays, setGeoIpAutoUpdateIntervalDays] = useState<number>(0);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Use PascalCase keys in params and inner models for data type
    const qDbPath       = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_Db_Path" });
    const qDownloadUrl  = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_Download_Url" });
    const qAccountId    = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_Account_ID" });
    const qLicenseKey   = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_License_Key" });
    const qAutoUpdateDays = useGetApiSettingsGet<SettingResponse>({
      Key: "GeoIp_Auto_Update_Interval_Days",
    });

  // DB version (inner model)
  const qDbVersion = useGetApiGeoLiteGetVerionDb<GetVersionDatabaseResponse>();

  const mSetSetting = usePostApiSettingsSet();

  const settingsReady =
    qDbPath.isFetched &&
    qDownloadUrl.isFetched &&
    qAccountId.isFetched &&
    qLicenseKey.isFetched &&
    qAutoUpdateDays.isFetched;

  const settingsSnapshotKey = useMemo(() => {
    if (!settingsReady) return "";
    return JSON.stringify({
      dbPath: qDbPath.data,
      downloadUrl: qDownloadUrl.data,
      accountId: qAccountId.data,
      licenseKey: qLicenseKey.data,
      autoUpdateDays: qAutoUpdateDays.data,
    });
  }, [
    settingsReady,
    qDbPath.data,
    qDownloadUrl.data,
    qAccountId.data,
    qLicenseKey.data,
    qAutoUpdateDays.data,
  ]);

  const [appliedSettingsKey, setAppliedSettingsKey] = useState("");
  if (settingsSnapshotKey && settingsSnapshotKey !== appliedSettingsKey) {
    setAppliedSettingsKey(settingsSnapshotKey);

    const safeValue = (resp: SettingResponse | undefined): string =>
      String(resp?.value ?? "");

    const safeInt = (resp: SettingResponse | undefined): number => {
      const raw = safeValue(resp);
      const n = parseInt(raw, 10);
      return Number.isFinite(n) && !Number.isNaN(n) ? n : 0;
    };

    setGeoIpDbPath(safeValue(qDbPath.data));
    setGeoIpDownloadUrl(safeValue(qDownloadUrl.data));
    setGeoIpAccountId(safeValue(qAccountId.data));
    setGeoIpLicenseKey(safeValue(qLicenseKey.data));
    setGeoIpAutoUpdateIntervalDays(safeInt(qAutoUpdateDays.data));
    setInitialLoading(false);
  }

  // Save handler
  const handleSave = async (
    key: string,
    value: string,
    type: "string" | "int"
  ) => {
    try {
      await mSetSetting.mutateAsync({
        params: {
          Key: key,                   // <-- PascalCase
          Value: String(value),       // <-- PascalCase
          Type: type,                 // <-- PascalCase
        } as PostApiSettingsSetParams,
      });

      toast.success(`${key} successfully updated.`);
      switch (key) {
        case "GeoIp_Db_Path":
          qDbPath.refetch();
          break;
        case "GeoIp_Download_Url":
          qDownloadUrl.refetch();
          break;
        case "GeoIp_Account_ID":
          qAccountId.refetch();
          break;
        case "GeoIp_License_Key":
          qLicenseKey.refetch();
          break;
        case "GeoIp_Auto_Update_Interval_Days":
          qAutoUpdateDays.refetch();
          break;
      }
    } catch (err: unknown) {
      const data = axios.isAxiosError(err) ? err.response?.data : undefined;
      const errField =
        data && typeof data === "object" && data !== null
          ? (data as Record<string, unknown>)["error"]
          : undefined;
      const message =
        (typeof errField === "string" ? errField : undefined) ??
        axiosResponseDataMessage(data) ??
        (axios.isAxiosError(err) ? err.message : undefined) ??
        errorMessage(err) ??
        "Unknown error";
      toast.error(`Failed to save ${key}: ${message}`);
    }
  };

  const anyLoading =
    initialLoading ||
    qDbPath.isLoading ||
    qDownloadUrl.isLoading ||
    qAccountId.isLoading ||
    qLicenseKey.isLoading ||
    qAutoUpdateDays.isLoading;

  const versionText = qDbVersion.data?.databaseVersion ?? ""; // <-- correct field

  return (
    <div>
      <h2 className="settings-page__h2-with-icon">
        <FaDatabase className="icon" aria-hidden />
        <span>
          GeoLite2 Settings{" "}
          {versionText ? <small className="opacity-muted">— DB {versionText}</small> : null}
        </span>
      </h2>
      <div className="settings-divider" />

      {anyLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading GeoLite settings...</p>
        </div>
      ) : (
        <>
          <div className="settings-group">
            <h4>GeoIP Database Path:</h4>
            <div className="settings-item">
              <input
                type="text"
                value={geoIpDbPath}
                onChange={(e) => setGeoIpDbPath(e.target.value)}
                className="input"
              />
              <button
                className="btn primary"
                onClick={() => handleSave("GeoIp_Db_Path", geoIpDbPath, "string")}
                disabled={mSetSetting.isPending}
              >
                {FaSave({ className: "icon" })} Save
              </button>
            </div>

            <h4>GeoIP Download URL:</h4>
            <div className="settings-item">
              <input
                type="text"
                value={geoIpDownloadUrl}
                onChange={(e) => setGeoIpDownloadUrl(e.target.value)}
                className="input"
              />
              <button
                className="btn primary"
                onClick={() =>
                  handleSave("GeoIp_Download_Url", geoIpDownloadUrl, "string")
                }
                disabled={mSetSetting.isPending}
              >
                {FaSave({ className: "icon" })} Save
              </button>
            </div>

            <h4>GeoIP Account ID:</h4>
            <div className="settings-item">
              <input
                type="text"
                value={geoIpAccountId}
                onChange={(e) => setGeoIpAccountId(e.target.value)}
                className="input"
              />
              <button
                className="btn primary"
                onClick={() =>
                  handleSave("GeoIp_Account_ID", geoIpAccountId, "string")
                }
                disabled={mSetSetting.isPending}
              >
                {FaSave({ className: "icon" })} Save
              </button>
            </div>

            <h4>GeoIP License Key:</h4>
            <div className="settings-item">
              <input
                type="text"
                value={geoIpLicenseKey}
                onChange={(e) => setGeoIpLicenseKey(e.target.value)}
                className="input"
              />
              <button
                className="btn primary"
                onClick={() =>
                  handleSave("GeoIp_License_Key", geoIpLicenseKey, "string")
                }
                disabled={mSetSetting.isPending}
              >
                {FaSave({ className: "icon" })} Save
              </button>
            </div>

            <h4>Auto-update interval (days):</h4>
            <div className="settings-item">
              <input
                type="number"
                min={0}
                step={1}
                value={geoIpAutoUpdateIntervalDays}
                onChange={(e) => setGeoIpAutoUpdateIntervalDays(Number(e.target.value))}
                className="input"
              />
              <button
                className="btn primary"
                onClick={() => {
                  const n = Math.max(0, Math.floor(geoIpAutoUpdateIntervalDays));
                  if (!Number.isFinite(n)) {
                    toast.error("Interval must be a non-negative integer.");
                    return;
                  }
                  handleSave(
                    "GeoIp_Auto_Update_Interval_Days",
                    String(n),
                    "int"
                  );
                }}
                disabled={mSetSetting.isPending}
              >
                {FaSave({ className: "icon" })} Save
              </button>
            </div>
            <p className="settings-item-description">
              0 disables automatic GeoLite2 checks. A positive value N lets the backend check for a
              newer database only when the local file is at least N days old (by modification time).
            </p>
          </div>

          <h2>GeoLite2 Downloader</h2>
          <div className="settings-divider" />
          <GeoLiteDbDownloader />

          <div className="db-info">
            <p className="db-description">
              This setting points to the <strong>GeoLite2-City</strong> DB used for IP geolocation.
              Provided by{" "}
              <a
                href="https://www.maxmind.com"
                target="_blank"
                rel="noopener noreferrer"
                className="link-accent--inline"
              >
                MaxMind
              </a>.
            </p>
            <p className="db-update">
              <strong>How it works:</strong> OpenVPN clients’ IP addresses are matched against this
              DB to determine approximate geo-info for analytics and security.
            </p>
            <p className="db-update">
              <strong>Manual update:</strong> Visit{" "}
              <a
                href="https://dev.maxmind.com/geoip/geolite2-free-geolocation-data"
                target="_blank"
                rel="noopener noreferrer"
                className="link-accent--inline"
              >
                MaxMind’s GeoLite2 DB page
              </a>{" "}
              and replace the file manually.
            </p>
          </div>
        </>
      )}
    </div>
  );
}

export default GeoLiteDbSettings;
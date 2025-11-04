// src/components/GeoLiteDbSettings.tsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "../css/Settings.css";
import { FaSave } from "react-icons/fa";
import { GeoLiteDbDownloader } from "./GeoLiteDbDownloader";

// orval-generated imports (adjust paths if needed)
import {
  useGetApiSettingsGet,
  usePostApiSettingsSet,
} from "../api/orval/settings/settings";
import type {
  GetApiSettingsGetParams,
  PostApiSettingsSetParams,
  SettingResponseApiResponse,
} from "../api/orval/model";

import { useGetApiGeoLiteGetVerionDb } from "../api/orval/geo-lite/geo-lite";
import type { GetVersionDatabaseResponseApiResponse } from "../api/orval/model";

export function GeoLiteDbSettings() {
  // Local editable state
  const [geoIpAccountId, setGeoIpAccountId] = useState("Fetching...");
  const [geoIpDbPath, setGeoIpDbPath] = useState("Fetching...");
  const [geoIpDownloadUrl, setGeoIpDownloadUrl] = useState("Fetching...");
  const [geoIpLicenseKey, setGeoIpLicenseKey] = useState("Fetching...");
  const [initialLoading, setInitialLoading] = useState(true);

  // Read settings via orval hooks
  const qDbPath = useGetApiSettingsGet<SettingResponseApiResponse, unknown>(
    { key: "GeoIp_Db_Path" } as GetApiSettingsGetParams
  );
  const qDownloadUrl = useGetApiSettingsGet<SettingResponseApiResponse, unknown>(
    { key: "GeoIp_Download_Url" } as GetApiSettingsGetParams
  );
  const qAccountId = useGetApiSettingsGet<SettingResponseApiResponse, unknown>(
    { key: "GeoIp_Account_ID" } as GetApiSettingsGetParams
  );
  const qLicenseKey = useGetApiSettingsGet<SettingResponseApiResponse, unknown>(
    { key: "GeoIp_License_Key" } as GetApiSettingsGetParams
  );

  // Optional: GeoLite DB version
  const qDbVersion =
    useGetApiGeoLiteGetVerionDb<GetVersionDatabaseResponseApiResponse>();

  // Write mutations via orval
  const mSetSetting = usePostApiSettingsSet();

  // Sync remote -> local editable fields once on load
  useEffect(() => {
    const allSettled =
      qDbPath.isFetched &&
      qDownloadUrl.isFetched &&
      qAccountId.isFetched &&
      qLicenseKey.isFetched;

    if (!allSettled) return;

    const safeValue = (resp: SettingResponseApiResponse | undefined) =>
      resp?.data?.value ?? "";

    setGeoIpDbPath(safeValue(qDbPath.data));
    setGeoIpDownloadUrl(safeValue(qDownloadUrl.data));
    setGeoIpAccountId(safeValue(qAccountId.data));
    setGeoIpLicenseKey(safeValue(qLicenseKey.data));

    setInitialLoading(false);
  }, [
    qDbPath.isFetched,
    qDownloadUrl.isFetched,
    qAccountId.isFetched,
    qLicenseKey.isFetched,
    qDbPath.data,
    qDownloadUrl.data,
    qAccountId.data,
    qLicenseKey.data,
  ]);

  // Save handler using generated model
  const handleSave = async (
    key: string,
    value: string,
    type: "string" | "number"
  ) => {
    try {
      await mSetSetting.mutateAsync({
        params: {
          key,
          value: type === "number" ? String(value) : value,
          type,
        } as PostApiSettingsSetParams,
      });

      toast.success(`${key} successfully updated.`);
      // Refetch just the affected key
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
      }
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Unknown error";
      toast.error(`Failed to save ${key}: ${message}`);
    }
  };

  // Compute flags/strings BEFORE render; no early return
  const anyLoading =
    initialLoading ||
    qDbPath.isLoading ||
    qDownloadUrl.isLoading ||
    qAccountId.isLoading ||
    qLicenseKey.isLoading;

  const versionText = qDbVersion.data?.version ?? "";

  return (
    <div>
      <h2>
        GeoLite2 Settings{" "}
        {versionText ? (
          <small style={{ opacity: 0.6 }}>— DB {versionText}</small>
        ) : null}
      </h2>
      <div style={{ borderTop: "1px solid #d1d5da" }}></div>

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
          </div>

          <h2>GeoLite2 Downloader</h2>
          <div style={{ borderTop: "1px solid #d1d5da" }}></div>
          <GeoLiteDbDownloader />

          <div className="db-info">
            <p className="db-description">
              This setting points to the <strong>GeoLite2-City</strong> DB used for IP geolocation.
              Provided by{" "}
              <a
                href="https://www.maxmind.com"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: "#58a6ff" }}
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
                style={{ color: "#58a6ff" }}
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
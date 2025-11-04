// src/components/GeoLiteDbSettings.tsx
import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import "../css/Settings.css";
import { FaSave } from "react-icons/fa";
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
} from "../api/orval/model";

import { useGetApiGeoLiteGetVerionDb } from "../api/orval/geo-lite/geo-lite";

export function GeoLiteDbSettings() {
  const [geoIpAccountId, setGeoIpAccountId] = useState<string>("Fetching...");
  const [geoIpDbPath, setGeoIpDbPath] = useState<string>("Fetching...");
  const [geoIpDownloadUrl, setGeoIpDownloadUrl] = useState<string>("Fetching...");
  const [geoIpLicenseKey, setGeoIpLicenseKey] = useState<string>("Fetching...");
  const [initialLoading, setInitialLoading] = useState<boolean>(true);

  // Use PascalCase keys in params and inner models for data type
    const qDbPath       = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_Db_Path" });
    const qDownloadUrl  = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_Download_Url" });
    const qAccountId    = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_Account_ID" });
    const qLicenseKey   = useGetApiSettingsGet<SettingResponse>({ Key: "GeoIp_License_Key" });

  // DB version (inner model)
  const qDbVersion = useGetApiGeoLiteGetVerionDb<GetVersionDatabaseResponse>();

  const mSetSetting = usePostApiSettingsSet();

  useEffect(() => {
    const allSettled =
      qDbPath.isFetched &&
      qDownloadUrl.isFetched &&
      qAccountId.isFetched &&
      qLicenseKey.isFetched;

    if (!allSettled) return;

    // With ogmMutator unwrapping, .data is the inner model already
    const safe = (resp: SettingResponse | undefined): string =>
      String(resp?.value ?? "");

    setGeoIpDbPath(safe(qDbPath.data));
    setGeoIpDownloadUrl(safe(qDownloadUrl.data));
    setGeoIpAccountId(safe(qAccountId.data));
    setGeoIpLicenseKey(safe(qLicenseKey.data));

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

  // Save handler
  const handleSave = async (
    key: string,
    value: string,
    type: "string" | "number"
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
      }
    } catch (err: any) {
      const message = err?.response?.data?.error || err?.message || "Unknown error";
      toast.error(`Failed to save ${key}: ${message}`);
    }
  };

  const anyLoading =
    initialLoading ||
    qDbPath.isLoading ||
    qDownloadUrl.isLoading ||
    qAccountId.isLoading ||
    qLicenseKey.isLoading;

  const versionText = qDbVersion.data?.databaseVersion ?? ""; // <-- correct field

  return (
    <div>
      <h2>
        GeoLite2 Settings{" "}
        {versionText ? <small style={{ opacity: 0.6 }}>— DB {versionText}</small> : null}
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
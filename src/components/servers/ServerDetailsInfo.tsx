// src/components/ServerDetailsInfo.tsx
import React from "react";
import { BsClock, BsCpu, BsHddNetwork, BsFillBookmarkStarFill, BsPerson, BsTag } from "react-icons/bs";
import { RiBarChart2Line, RiHardDrive2Line } from "react-icons/ri";
import { IoIosSpeedometer, IoMdPerson } from "react-icons/io";
import type { VpnServerResponse, VpnServerWithStatusDto } from "../../api/orvalModelShim";
import { VpnStackLogo } from "./VpnStackLogo";

export type ConflogPayloadSummary = {
  application?: string | null;
  version?: string | null;
  config?: {
    vpnSubnet?: string | null;
    vpnNetmask?: string | null;
    port?: string | null;
    proto?: string | null;
  };
};

/** Props may carry fields from either API shape (merged in GeneralServerDetails). */
export type ServerDetailsServerInfo =
  | (Partial<VpnServerWithStatusDto> & Partial<VpnServerResponse>)
  | null
  | undefined;

interface Props {
  serverInfo: ServerDetailsServerInfo;
  toHumanReadableSize: (bytes: number) => string;
  /** show per-field shimmer placeholders */
  loading?: boolean;
  /** IP and port from OVPN file config */
  configIp?: string | null;
  configPort?: number | null;
  /** From latest conflog (for General tab) */
  latestConflogPayload?: ConflogPayloadSummary | null;
  /** Quota plan names this server is allowed for (from quota-plan-allowed-servers) */
  quotaPlanLabels?: string[] | null;
}

/** Simple shimmer skeleton */
const Skeleton: React.FC<{ width?: number | string; height?: number | string; className?: string }> = ({
  width = 140,
  height = 14,
  className = "",
}) => (
  <span className={`skeleton ${className}`} style={{ width, height }} aria-label="loading" />
);

const ServerDetailsInfo: React.FC<Props> = ({
  serverInfo,
  toHumanReadableSize,
  loading = false,
  configIp,
  configPort,
  latestConflogPayload,
  quotaPlanLabels,
}) => {
  // When loading, we still render the layout with skeletons
  const safe = serverInfo ?? {};

  const server = (() => {
    const wr = safe.vpnServerResponses;
    const inner = wr?.vpnServer;
    if (wr && inner) {
      const wrapperId = (wr as VpnServerResponse & { id?: number }).id;
      return { ...inner, id: wrapperId ?? inner.id };
    }
    return safe.vpnServer ?? null;
  })();

  const status = safe.vpnServerStatusLogResponse ?? null;

  // Early state: if nothing and not loading
  if (!server && !loading) return <p>No server information available.</p>;

  const totalBytesIn = safe.totalBytesIn ?? 0;
  const totalBytesOut = safe.totalBytesOut ?? 0;
  const countConnectedClients = safe.countConnectedClients ?? 0;
  const countSessions = safe.countSessions ?? 0;

  const dcoIsEnabled = server?.dcoIsEnabled === true;

  return (
    <div className={`server-info ${loading ? "is-loading" : ""}`}>
      {!loading && dcoIsEnabled && (
        <div className="dco-stats-alert" role="alert">
          <strong>DCO enabled:</strong> Traffic and session statistics on this page may be less accurate. With Data Channel Offload enabled, part of the VPN processing runs in the kernel and may not be fully reported to the monitoring layer, so displayed totals can differ from actual usage.
        </div>
      )}
      <div className="server-header">
        <div className="server-meta">
          <strong className="server-name">
            {loading ? <Skeleton width={220} height={16} /> : (server?.serverName ?? "(unknown??)")}
          </strong>
        </div>
        <div className={`server-status ${server?.isOnline ? "status-online" : "status-offline"}`}>
          {loading ? (
            <Skeleton width={80} />
          ) : (
            <>
              <VpnStackLogo
                serverType={server?.serverType as number | undefined}
                size={18}
              />
              {server?.isOnline ? "✅ Online" : "❌ Offline"}
            </>
          )}
        </div>
      </div>

      <div className="server-details">
        <div className="detail-row">
          <BsClock className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Uptime:</span>
            <span>
              {loading ? (
                <Skeleton width={180} />
              ) : status?.upSince ? new Date(status.upSince).toLocaleString() : "N/A"}
            </span>
          </div>
        </div>

        <div className="detail-row">
          <RiHardDrive2Line className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Version:</span>
            <span>{loading ? <Skeleton width={90} /> : (status?.version || "Unknown")}</span>
          </div>
        </div>

        <div className="detail-row">
          <BsCpu className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">DCO (Data Channel Offload):</span>
            <span>
              {loading ? (
                <Skeleton width={40} />
              ) : server?.dcoIsEnabled === true ? (
                "Yes"
              ) : server?.dcoIsEnabled === false ? (
                "No"
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>

        <div className="detail-row">
          <BsHddNetwork className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Local IP:</span>
            <span>{loading ? <Skeleton width={140} /> : (status?.serverLocalIp || "N/A")}</span>
          </div>
        </div>

        <div className="detail-row">
          <BsHddNetwork className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Remote IP:</span>
            <span>{loading ? <Skeleton width={160} /> : (status?.serverRemoteIp || "N/A")}</span>
          </div>
        </div>

        {(configIp != null || configPort != null) && (
          <>
            {configIp != null && configIp !== "" && (
              <div className="detail-row">
                <BsHddNetwork className="detail-icon" aria-hidden />
                <div className="detail-row-main">
                  <span className="detail-label">Config IP:</span>
                  <span>{loading ? <Skeleton width={140} /> : configIp}</span>
                </div>
              </div>
            )}
            {configPort != null && (
              <div className="detail-row">
                <BsHddNetwork className="detail-icon" aria-hidden />
                <div className="detail-row-main">
                  <span className="detail-label">Config Port:</span>
                  <span>{loading ? <Skeleton width={80} /> : String(configPort)}</span>
                </div>
              </div>
            )}
          </>
        )}

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Traffic IN:</span>
            <span>{loading ? <Skeleton width={120} /> : toHumanReadableSize(status?.bytesIn ?? 0)}</span>
          </div>
        </div>

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Traffic OUT:</span>
            <span>{loading ? <Skeleton width={120} /> : toHumanReadableSize(status?.bytesOut ?? 0)}</span>
          </div>
        </div>

        <div className="detail-row">
          <BsHddNetwork className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Server session Id:</span>
            <span>{loading ? <Skeleton width={280} /> : (status?.sessionId || "N/A")}</span>
          </div>
        </div>

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Total Traffic IN:</span>
            <span>{loading ? <Skeleton width={130} /> : toHumanReadableSize(totalBytesIn)}</span>
          </div>
        </div>

        <div className="detail-row">
          <IoIosSpeedometer className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Total Traffic OUT:</span>
            <span>{loading ? <Skeleton width={130} /> : toHumanReadableSize(totalBytesOut)}</span>
          </div>
        </div>

        <div className="detail-row">
          <IoMdPerson className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Count connected clients:</span>
            <span>{loading ? <Skeleton width={60} /> : countConnectedClients}</span>
          </div>
        </div>

        <div className="detail-row">
          <BsPerson className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Count sessions:</span>
            <span>{loading ? <Skeleton width={90} /> : countSessions}</span>
          </div>
        </div>

        <div className="detail-row">
          <BsPerson className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">API url:</span>
            <span>
              {loading ? (
                <Skeleton width={260} />
              ) : server?.apiUrl ? (
                <a href={server.apiUrl} target="_blank" rel="noreferrer" style={{ color: "#58a6ff" }}>
                  {server.apiUrl}
                </a>
              ) : (
                "N/A"
              )}
            </span>
          </div>
        </div>

        <div className="detail-row">
          <RiBarChart2Line className="detail-icon" aria-hidden />
          <div className="detail-row-main">
            <span className="detail-label">Quota plans:</span>
            <span>
              {loading ? (
                <Skeleton width={220} />
              ) : quotaPlanLabels != null && quotaPlanLabels.length > 0 ? (
                quotaPlanLabels.join(", ")
              ) : (
                "—"
              )}
            </span>
          </div>
        </div>

        {!loading && server?.isDefault && (
          <div className="detail-row">
            <BsFillBookmarkStarFill className="detail-icon" aria-hidden />
            <div className="detail-row-main">
              <span className="detail-label">Default server</span>
            </div>
          </div>
        )}

        {latestConflogPayload && (
          <>
            <div className="detail-row">
              <RiHardDrive2Line className="detail-icon" aria-hidden />
              <div className="detail-row-main">
                <span className="detail-label">Conflog Application:</span>
                <span>{latestConflogPayload.application ?? "—"}</span>
              </div>
            </div>
            <div className="detail-row">
              <RiHardDrive2Line className="detail-icon" aria-hidden />
              <div className="detail-row-main">
                <span className="detail-label">Conflog Version:</span>
                <span>{latestConflogPayload.version ?? "—"}</span>
              </div>
            </div>
            <div className="detail-row">
              <BsHddNetwork className="detail-icon" aria-hidden />
              <div className="detail-row-main">
                <span className="detail-label">Conflog Subnet:</span>
                <span>{latestConflogPayload.config?.vpnSubnet ?? "—"}</span>
              </div>
            </div>
            <div className="detail-row">
              <BsHddNetwork className="detail-icon" aria-hidden />
              <div className="detail-row-main">
                <span className="detail-label">Conflog Mask:</span>
                <span>{latestConflogPayload.config?.vpnNetmask ?? "—"}</span>
              </div>
            </div>
            <div className="detail-row">
              <BsHddNetwork className="detail-icon" aria-hidden />
              <div className="detail-row-main">
                <span className="detail-label">Conflog Port:</span>
                <span>{latestConflogPayload.config?.port ?? "—"}</span>
              </div>
            </div>
            <div className="detail-row">
              <BsHddNetwork className="detail-icon" aria-hidden />
              <div className="detail-row-main">
                <span className="detail-label">Conflog Proto:</span>
                <span>{latestConflogPayload.config?.proto ?? "—"}</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="server-tags-block">
        <div className="detail-row-tags-heading">
          <BsTag className="detail-icon" />
          <span className="detail-label">Tags:</span>
        </div>
        <span className="server-tags-list">
          {loading ? (
            <Skeleton width={120} />
          ) : Array.isArray(server?.tags) && server.tags.length > 0 ? (
            server.tags.map((tag: string) => (
              <span key={tag} className="server-tag-pill">
                {tag}
              </span>
            ))
          ) : (
            "—"
          )}
        </span>
      </div>
    </div>
  );
};

export default ServerDetailsInfo;
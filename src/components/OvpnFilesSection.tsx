// src/sections/OvpnFilesSection.tsx
import React, { useMemo, useCallback } from "react";
import OvpnFilesTable from "../components/OvpnFilesTable";
import AddOvpnFile from "../components/AddOvpnFile";

// orval hooks
import {
  useGetApiOpenVpnFilesGetAllVpnServerId,
  useGetApiOpenVpnFilesGetAllVpnServerIdExternalId,
} from "../api/orval/open-vpn-files/open-vpn-files";

interface Props {
  vpnServerId: string;          // comes as string in props
  externalId?: string;          // optional: when provided, fetch by externalId (server-scoped)
  isRevoked?: boolean;          // optional filter, default false
}

const OvpnFilesSection: React.FC<Props> = ({ vpnServerId, externalId, isRevoked = false }) => {
  // Parse server id once
  const serverIdNum = useMemo(() => {
    const n = Number(vpnServerId);
    return Number.isFinite(n) ? n : 0;
  }, [vpnServerId]);

  const hasServerId = serverIdNum > 0;
  const ext = (externalId ?? "").trim();
  const hasExternalId = ext.length > 0;

  // When externalId supplied -> use `/get-all/{serverId}/{externalId}`; otherwise `/get-all/{serverId}`
  const {
    data: dataByServer,
    error: errorByServer,
    isLoading: loadingByServer,
    refetch: refetchByServer,
  } = useGetApiOpenVpnFilesGetAllVpnServerId(serverIdNum, {
    query: {
      enabled: hasServerId && !hasExternalId,
      // keep previous data on param flip to avoid flicker
      placeholderData: (prev) => prev,
    },
  });

  const {
    data: dataByExternal,
    error: errorByExternal,
    isLoading: loadingByExternal,
    refetch: refetchByExternal,
  } = useGetApiOpenVpnFilesGetAllVpnServerIdExternalId(serverIdNum, ext, {
    query: {
      enabled: hasServerId && hasExternalId,
      placeholderData: (prev) => prev,
    },
  });

  // Normalized array: hooks in this project return unwrapped data via ogmMutator.
  // It may be either an array or an object like { ovpnFiles: [...] } — handle both.
  const ovpnFiles = useMemo(() => {
    const raw = hasExternalId ? dataByExternal : dataByServer;
    const list =
      Array.isArray(raw)
        ? raw
        : Array.isArray((raw as any)?.ovpnFiles)
          ? (raw as any).ovpnFiles
          : [];
    return isRevoked ? list.filter((x: any) => x?.isRevoked === true) : list;
  }, [hasExternalId, dataByExternal, dataByServer, isRevoked]);

  const loading = loadingByServer || loadingByExternal;

  // Prefer meaningful error from whichever query was used
  const ovpnError = (errorByExternal ?? errorByServer) as any | undefined;
  const normalizedError =
    ovpnError
      ? {
          message:
            ovpnError?.response?.data?.Message ||
            ovpnError?.message ||
            "Failed to load OVPN files",
          detail: ovpnError?.response?.data?.Detail,
        }
      : null;

  const reload = useCallback(() => {
    return hasExternalId ? refetchByExternal() : refetchByServer();
  }, [hasExternalId, refetchByExternal, refetchByServer]);

  return (
    <>
      {normalizedError && (
        <p className="error-message">
          {normalizedError.message}
          <br />
          {normalizedError.detail}
        </p>
      )}

      <h3>
        Issued OVPN Files{" "}
        {hasExternalId ? (
          <small>
            (filtered by External ID: <code>{ext}</code>, revoked: {String(isRevoked)})
          </small>
        ) : (
          <small>
            (server: <code>{vpnServerId}</code>)
          </small>
        )}
      </h3>

      <h5>Make New OVPN File for Client</h5>
      <p className="certificate-description">
        Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
      </p>

      {/* After successful create we refetch the active query */}
      <AddOvpnFile vpnServerId={vpnServerId} onSuccess={reload} />

      <OvpnFilesTable
        ovpnFiles={Array.isArray(ovpnFiles) ? ovpnFiles : []}
        vpnServerId={vpnServerId}
        onRevoke={reload}
        loading={loading}
      />
    </>
  );
};

export default OvpnFilesSection;

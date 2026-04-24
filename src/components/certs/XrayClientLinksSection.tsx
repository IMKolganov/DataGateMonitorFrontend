import React, { useEffect, useMemo } from "react";
import { FaFileArchive, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import XrayClientLinksTable from "../xray/XrayClientLinksTable.tsx";
import AddXrayClientLink from "../xray/AddXrayClientLink.tsx";
import { useGetApiXrayClientLinksGetAllVpnServerId } from "../../api/xrayClientLinks.ts";
import type { OvpnFilesResponse } from "../../api/orvalModelShim";
import type { OvpnRowInput } from "../ovpn-files/OvpnFilesTable.tsx";
import { pickArray } from "../../utils/pickPayloadArray.ts";
import { errorMessage as baseErrorMessage } from "../../utils/errorMessage";

function getErrorMessage(err: unknown): string {
  if (axios.isAxiosError(err) && err.response?.data !== undefined) {
    const data = err.response.data;
    if (typeof data === "string") return data;
    if (typeof data === "object" && data !== null) {
      const r = data as Record<string, unknown>;
      const msg = r["message"] ?? r["title"];
      if (typeof msg === "string") return msg;
      const errors = r["errors"];
      if (Array.isArray(errors)) return errors.map(String).join(", ");
    }
  }
  return baseErrorMessage(err);
}

interface Props {
  vpnServerId: string;
}

const XrayClientLinksSection: React.FC<Props> = ({ vpnServerId }) => {
  const numericId = useMemo(() => Number(vpnServerId), [vpnServerId]);
  const isValidId = Number.isFinite(numericId) && numericId > 0;

  const filesQuery = useGetApiXrayClientLinksGetAllVpnServerId(
    isValidId ? numericId : (undefined as unknown as number),
    {
      query: { enabled: isValidId, staleTime: 10_000, retry: 1 },
    },
  );

  const links = pickArray(filesQuery.data as OvpnFilesResponse) as OvpnRowInput[];

  useEffect(() => {
    if (filesQuery.isError) {
      toast.error(`Failed to load client links: ${getErrorMessage(filesQuery.error)}`, {
        toastId: "xray-links-load-error",
      });
    }
  }, [filesQuery.isError, filesQuery.error]);

  const refetchLinks = async () =>
    toast.promise(filesQuery.refetch(), {
      pending: "Refreshing client links…",
      success: "Client links are up to date",
      error: {
        render({ data }: { data?: unknown }) {
          const err =
            data && typeof data === "object" && data !== null && "error" in data
              ? (data as { error: unknown }).error
              : data;
          return `Failed to refresh client links: ${getErrorMessage(err)}`;
        },
      },
    });

  const silentRefetchLinks = async () => {
    try {
      await filesQuery.refetch();
    } catch (e) {
      toast.error(`Failed to refresh client links: ${getErrorMessage(e)}`, { toastId: "xray-links-refetch-error" });
    }
  };

  return (
    <section
      className="certificates-page__section server-details__panel"
      aria-labelledby="xray-client-links-heading"
    >
      <h3 id="xray-client-links-heading" className="settings-card__h3-with-icon">
        <FaFileArchive className="icon" aria-hidden />
        <span>Issued VLESS client links</span>
      </h3>

      <div className="certificates-page__add-block">
        <h4 className="certificates-page__subtitle certificates-page__add-block-title">
          <FaPlus className="icon" aria-hidden />
          Create client link
        </h4>
        <p className="certificate-description certificates-page__add-block-desc">
          Enter a <strong>Common Name (CN)</strong> and <strong>External ID</strong>. The dashboard calls
          DataGateXRayManager to build a short-lived cert and a link file from your{" "}
          <strong>Client export template</strong> (server settings).
        </p>

        <AddXrayClientLink
          vpnServerId={vpnServerId}
          onSuccess={async () => {
            await refetchLinks();
          }}
        />
      </div>

      <XrayClientLinksTable
        links={links}
        vpnServerId={vpnServerId}
        loading={filesQuery.isFetching}
        onRevoke={async () => {
          toast.success("Client link revoked", { toastId: "xray-link-revoked" });
          await silentRefetchLinks();
        }}
      />
    </section>
  );
};

export default XrayClientLinksSection;

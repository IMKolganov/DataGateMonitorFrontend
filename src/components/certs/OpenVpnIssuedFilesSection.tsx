import React, { useEffect, useMemo } from "react";
import { FaFileArchive, FaPlus } from "react-icons/fa";
import { toast } from "react-toastify";
import axios from "axios";
import OvpnFilesTable, { type OvpnRowInput } from "../ovpn-files/OvpnFilesTable.tsx";
import AddOvpnFile from "../ovpn-files/AddOvpnFile.tsx";
import { useGetApiOpenVpnFilesGetAllVpnServerId } from "../../api/orval/open-vpn-files/open-vpn-files.ts";
import type { OvpnFilesResponse } from "../../api/orval/model";
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

const OpenVpnIssuedFilesSection: React.FC<Props> = ({ vpnServerId }) => {
  const numericId = useMemo(() => Number(vpnServerId), [vpnServerId]);
  const isValidId = Number.isFinite(numericId) && numericId > 0;

  const filesQuery = useGetApiOpenVpnFilesGetAllVpnServerId(
    isValidId ? numericId : (undefined as unknown as number),
    {
      query: { enabled: isValidId, staleTime: 10_000, retry: 1 },
    },
  );

  const ovpnFiles = pickArray(filesQuery.data as OvpnFilesResponse) as OvpnRowInput[];

  useEffect(() => {
    if (filesQuery.isError) {
      toast.error(`Failed to load OVPN files: ${getErrorMessage(filesQuery.error)}`, {
        toastId: "openvpn-files-load-error",
      });
    }
  }, [filesQuery.isError, filesQuery.error]);

  const refetchFiles = async () =>
    toast.promise(filesQuery.refetch(), {
      pending: "Refreshing OVPN files…",
      success: "OVPN files are up to date",
      error: {
        render({ data }: { data?: unknown }) {
          const err =
            data && typeof data === "object" && data !== null && "error" in data
              ? (data as { error: unknown }).error
              : data;
          return `Failed to refresh OVPN files: ${getErrorMessage(err)}`;
        },
      },
    });

  const silentRefetchFiles = async () => {
    try {
      await filesQuery.refetch();
    } catch (e) {
      toast.error(`Failed to refresh OVPN files: ${getErrorMessage(e)}`, { toastId: "openvpn-files-refetch-error" });
    }
  };

  return (
    <section
      className="certificates-page__section server-details__panel"
      aria-labelledby="certificates-ovpn-heading"
    >
      <h3 id="certificates-ovpn-heading" className="settings-card__h3-with-icon">
        <FaFileArchive className="icon" aria-hidden />
        <span>Issued OVPN Files</span>
      </h3>

      <div className="certificates-page__add-block">
        <h4 className="certificates-page__subtitle certificates-page__add-block-title">
          <FaPlus className="icon" aria-hidden />
          Make New OVPN File for Client
        </h4>
        <p className="certificate-description certificates-page__add-block-desc">
          Enter the <strong>Common Name (CN)</strong> and an <strong>External ID</strong> to generate a new OVPN file.
        </p>

        <AddOvpnFile
          vpnServerId={vpnServerId}
          onSuccess={async () => {
            await refetchFiles();
          }}
        />
      </div>

      <OvpnFilesTable
        ovpnFiles={ovpnFiles}
        vpnServerId={vpnServerId}
        loading={filesQuery.isFetching}
        onRevoke={async () => {
          toast.success("OVPN file revoked", { toastId: "ovpn-revoked" });
          await silentRefetchFiles();
        }}
      />
    </section>
  );
};

export default OpenVpnIssuedFilesSection;

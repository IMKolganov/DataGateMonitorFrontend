import { FaServer, FaTrash } from "react-icons/fa";
import {
  useGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanId,
  getGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanIdQueryKey,
  usePostApiQuotaPlanAllowedServersCreate,
  useDeleteApiQuotaPlanAllowedServersDeleteId,
} from "../../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import {
  useGetApiV3OpenVpnServersGetAll,
  getGetApiV3OpenVpnServersGetAllQueryKey,
  getGetApiV3OpenVpnServersGetAllWithStatusQueryKey,
} from "../../api/orval/vpn-servers-v3/vpn-servers-v3";
import type {
  QuotaPlanAllowedServerDto,
  VpnServersV3Response,
  GetQuotaPlanAllowedServersByQuotaPlanIdResponse,
} from "../../api/orvalModelShim";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "react-toastify";
import "../../css/Settings.css";
import "../../css/Table.css";

type Props = {
  isOpen: boolean;
  planId: number;
  planName: string;
  onClose: () => void;
};

export function QuotaPlanAllowedServersModal({
  isOpen,
  planId,
  planName,
  onClose,
}: Props) {
  const queryClient = useQueryClient();

  const { data: allowedData } =
    useGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanId(planId);
  const allowed: QuotaPlanAllowedServerDto[] =
    (allowedData as GetQuotaPlanAllowedServersByQuotaPlanIdResponse | undefined)?.items ?? [];

  const { data: serversData } = useGetApiV3OpenVpnServersGetAll({});
  const servers =
    (serversData as VpnServersV3Response | undefined)?.vpnServers ?? [];

  const createMutation = usePostApiQuotaPlanAllowedServersCreate();
  const deleteMutation = useDeleteApiQuotaPlanAllowedServersDeleteId();

  const allowedVpnServerIds = new Set(
    allowed.map((a) => a.vpnServerId).filter((id): id is number => id != null)
  );
  const availableServers = servers.filter(
    (s) => s.id != null && !allowedVpnServerIds.has(s.id)
  );

  const invalidate = () => {
    queryClient.invalidateQueries({
      queryKey: getGetApiQuotaPlanAllowedServersGetByQuotaPlanIdQuotaPlanIdQueryKey(
        planId
      ),
    });
    queryClient.invalidateQueries({ queryKey: getGetApiV3OpenVpnServersGetAllQueryKey(undefined) });
    queryClient.invalidateQueries({
      queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
    });
  };

  const handleAdd = (vpnServerId: number) => {
    createMutation.mutate(
      {
        data: {
          quotaPlanId: planId,
          vpnServerId,
        },
      },
      {
        onSuccess: () => {
          toast.success("Server added");
          invalidate();
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } }; message?: string };
          toast.error(
            err?.response?.data?.message ?? (err as Error)?.message ?? "Add failed"
          );
        },
      }
    );
  };

  const handleRemove = (id: number) => {
    if (!window.confirm("Remove this server from the allowed list?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Server removed");
          invalidate();
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { message?: string } }; message?: string };
          toast.error(
            err?.response?.data?.message ?? (err as Error)?.message ?? "Remove failed"
          );
        },
      }
    );
  };

  const getServerName = (vpnServerId: number) =>
    servers.find((s) => s.id === vpnServerId)?.serverName ?? `Server #${vpnServerId}`;

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content quota-plan-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="settings-card__h3-with-icon">
            <FaServer className="icon" aria-hidden />
            <span>
              Allowed servers: {planName}
            </span>
          </h3>
          <button
            type="button"
            className="modal-close"
            onClick={onClose}
            aria-label="Close"
          >
            &times;
          </button>
        </div>
        <div style={{ padding: 20 }}>
          <p className="settings-item-description" style={{ marginBottom: 12 }}>
            Servers on which this quota plan can be used. Add or remove below.
          </p>

          <div className="header-bar" style={{ marginBottom: 12 }}>
            <div className="left-buttons">
              <select
                className="input"
                style={{ maxWidth: 280 }}
                defaultValue=""
                onChange={(e) => {
                  const v = e.target.value;
                  e.target.value = "";
                  if (v) handleAdd(Number(v));
                }}
                disabled={availableServers.length === 0 || createMutation.isPending}
              >
                <option value="">Add server…</option>
                {availableServers.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.serverName ?? `Server #${s.id}`}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {allowed.length === 0 ? (
            <p style={{ color: "#8b949e" }}>
              No servers. This plan is not restricted to specific servers, or add one above.
            </p>
          ) : (
            <div className="table-container" style={{ padding: 0 }}>
              <table className="user-quota-assignments-table">
                <thead>
                  <tr>
                    <th>Server</th>
                    <th style={{ width: 90 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allowed.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.vpnServerId != null
                          ? getServerName(a.vpnServerId)
                          : "—"}
                      </td>
                      <td>
                        <div className="action-container">
                          <button
                            type="button"
                            className="btn danger"
                            onClick={() => a.id != null && handleRemove(a.id)}
                            disabled={deleteMutation.isPending}
                            title="Remove"
                          >
                            <FaTrash className="icon" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuotaPlanAllowedServersModal;

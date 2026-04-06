import { useCallback, useEffect, useState, useMemo } from "react";
import { FaPlus, FaSync, FaEdit, FaTrash, FaStar, FaServer } from "react-icons/fa";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../../components/ui/ThemeProvider.tsx";
import { toast } from "react-toastify";

import {
  usePostApiQuotaPlansGetAll,
  usePostApiQuotaPlansCreate,
  usePutApiQuotaPlansUpdate,
  useDeleteApiQuotaPlansDeleteId,
  usePostApiQuotaPlansSetDefaultId,
} from "../../api/orval/quota-plan/quota-plan";
import type {
  QuotaPlanDto,
  CreateOrUpdateQuotaPlanRequest,
  QuotaPlansResponse,
} from "../../api/orval/model";
import type { ApiEnvelope } from "../TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "../TelegramBotSettings/unwrapApiResponse";
import { QuotaPlanFormModal } from "./QuotaPlanFormModal";
import { QuotaPlanAllowedServersModal } from "./QuotaPlanAllowedServersModal";
import { usePersistedPageSize } from "../../hooks/usePersistedPageSize";
import "../../css/Settings.css";
import "../../css/Table.css";

function formatBytes(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)} GB`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)} MB`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)} KB`;
  return String(n);
}

export function QuotaPlansSettings() {
  const [plans, setPlans] = useState<QuotaPlanDto[]>([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<QuotaPlanDto | null>(null);
  const [allowedServersPlan, setAllowedServersPlan] = useState<QuotaPlanDto | null>(null);
  const [quotaPlansGridPage, setQuotaPlansGridPage] = useState(0);
  const [quotaPlansPageSize, setQuotaPlansPageSize] = usePersistedPageSize(
    "quota-plans",
    10,
    "5,10,20,50",
  );

  const getAllMutation = usePostApiQuotaPlansGetAll();
  const loadPlansMutate = getAllMutation.mutate;
  const createMutation = usePostApiQuotaPlansCreate();
  const updateMutation = usePutApiQuotaPlansUpdate();
  const deleteMutation = useDeleteApiQuotaPlansDeleteId();
  const setDefaultMutation = usePostApiQuotaPlansSetDefaultId();

  const loadPlans = useCallback(() => {
    loadPlansMutate(
      { data: { includeInactive: true } },
      {
        onSuccess: (raw) => {
          const payload = unwrapMaybeApiResponse<QuotaPlansResponse>(
            raw as QuotaPlansResponse | ApiEnvelope<QuotaPlansResponse> | undefined,
          );
          setPlans(payload?.quotaPlans ?? []);
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
          toast.error(
            err?.response?.data?.error ??
              err?.response?.data?.message ??
              (err as Error)?.message ??
              "Failed to load quota plans"
          );
        },
      }
    );
  }, [loadPlansMutate]);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  const isBusy =
    getAllMutation.isPending ||
    createMutation.isPending ||
    updateMutation.isPending ||
    deleteMutation.isPending ||
    setDefaultMutation.isPending;

  const handleCreate = () => {
    setEditingPlan(null);
    setModalOpen(true);
  };

  const handleEdit = (plan: QuotaPlanDto) => {
    setEditingPlan(plan);
    setModalOpen(true);
  };

  const handleModalSubmit = (data: CreateOrUpdateQuotaPlanRequest) => {
    const isEdit = data.id != null && data.id > 0;
    if (isEdit) {
      updateMutation.mutate(
        { data },
        {
          onSuccess: () => {
            toast.success("Quota plan updated");
            setModalOpen(false);
            setEditingPlan(null);
            loadPlans();
          },
          onError: (e: unknown) => {
            const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
            toast.error(
              err?.response?.data?.error ??
                err?.response?.data?.message ??
                (err as Error)?.message ??
                "Update failed"
            );
          },
        }
      );
    } else {
      createMutation.mutate(
        { data },
        {
          onSuccess: () => {
            toast.success("Quota plan created");
            setModalOpen(false);
            setEditingPlan(null);
            loadPlans();
          },
          onError: (e: unknown) => {
            const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
            toast.error(
              err?.response?.data?.error ??
                err?.response?.data?.message ??
                (err as Error)?.message ??
                "Create failed"
            );
          },
        }
      );
    }
  };

  const handleDelete = (id: number) => {
    if (!window.confirm("Delete this quota plan?")) return;
    deleteMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Quota plan deleted");
          loadPlans();
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
          toast.error(
            err?.response?.data?.error ??
              err?.response?.data?.message ??
              (err as Error)?.message ??
              "Delete failed"
          );
        },
      }
    );
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(
      { id },
      {
        onSuccess: () => {
          toast.success("Default plan updated");
          loadPlans();
        },
        onError: (e: unknown) => {
          const err = e as { response?: { data?: { error?: string; message?: string } }; message?: string };
          toast.error(
            err?.response?.data?.error ??
              err?.response?.data?.message ??
              (err as Error)?.message ??
              "Set default failed"
          );
        },
      }
    );
  };

  const rows = useMemo(
    () =>
      (plans ?? []).map((p, index) => ({
        id: p.id ?? index,
        name: p.name ?? "—",
        description: p.description ?? "—",
        dailyQuota: formatBytes(p.dailyQuotaBytes),
        monthlyQuota: formatBytes(p.monthlyQuotaBytes),
        upKbps: p.upKbps != null ? String(p.upKbps) : "—",
        downKbps: p.downKbps != null ? String(p.downKbps) : "—",
        isActive: p.isActive ? "Yes" : "No",
        isDefault: p.isDefault ? "★ Default" : "",
        raw: p,
      })),
    [plans]
  );

  const columns: GridColDef[] = [
    { field: "id", headerName: "ID", width: 70 },
    { field: "name", headerName: "Name", flex: 1, minWidth: 120 },
    { field: "description", headerName: "Description", flex: 1, minWidth: 120 },
    { field: "dailyQuota", headerName: "Daily", width: 100 },
    { field: "monthlyQuota", headerName: "Monthly", width: 100 },
    { field: "upKbps", headerName: "Up (Kbps)", width: 90 },
    { field: "downKbps", headerName: "Down (Kbps)", width: 100 },
    { field: "isActive", headerName: "Active", width: 70 },
    { field: "isDefault", headerName: "Default", width: 90 },
    {
      field: "actions",
      headerName: "Actions",
      width: 260,
      renderCell: (params) => {
        const plan = params.row.raw as QuotaPlanDto;
        const planId = plan.id;
        if (planId == null) return null;
        return (
          <div className="action-container">
            <button
              type="button"
              className="btn secondary"
              onClick={() => setAllowedServersPlan(plan)}
              disabled={isBusy}
              title="Allowed servers"
            >
              {FaServer({ className: "icon" })}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => handleSetDefault(planId)}
              disabled={isBusy || plan.isDefault}
              title="Set as default"
            >
              {FaStar({ className: "icon" })}
            </button>
            <button
              type="button"
              className="btn secondary"
              onClick={() => handleEdit(plan)}
              disabled={isBusy}
              title="Edit"
            >
              {FaEdit({ className: "icon" })}
            </button>
            <button
              type="button"
              className="btn danger"
              onClick={() => handleDelete(planId)}
              disabled={isBusy}
              title="Delete"
            >
              {FaTrash({ className: "icon" })}
            </button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <h2>Quota plans</h2>
      <div style={{ borderTop: "1px solid var(--border-color)", marginTop: 8 }} />

      <p className="settings-item-description" style={{ marginBottom: 16 }}>
        Manage quota plans: add, edit, delete, and set the default plan for new users.
      </p>

      <div className="header-bar">
        <div className="left-buttons">
          <button
            type="button"
            className="btn secondary"
            onClick={loadPlans}
            disabled={isBusy}
          >
            {FaSync({ className: `icon ${getAllMutation.isPending ? "icon-spin" : ""}` })} Refresh
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={handleCreate}
            disabled={isBusy}
          >
            {FaPlus({ className: "icon" })} Add plan
          </button>
        </div>
      </div>

      {getAllMutation.isPending && plans.length === 0 ? (
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading quota plans…</p>
        </div>
      ) : (
        <CustomThemeProvider>
          <div
            className="data-grid-wrap"
            style={{
              backgroundColor: "var(--bg-body)",
              padding: 10,
              borderRadius: 8,
            }}
          >
            <StyledDataGrid
              rows={rows}
              columns={columns}
              pageSizeOptions={[5, 10, 20, 50]}
              paginationMode="client"
              paginationModel={{ page: quotaPlansGridPage, pageSize: quotaPlansPageSize }}
              onPaginationModelChange={(m) => {
                setQuotaPlansGridPage(m.page);
                setQuotaPlansPageSize(m.pageSize);
              }}
              slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
              localeText={{ noRowsLabel: "No quota plans. Click «Add plan» to create one." }}
            />
          </div>
        </CustomThemeProvider>
      )}

      <QuotaPlanFormModal
        isOpen={modalOpen}
        editPlan={editingPlan}
        onClose={() => {
          setModalOpen(false);
          setEditingPlan(null);
        }}
        onSubmit={handleModalSubmit}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
      />

      {allowedServersPlan != null && allowedServersPlan.id != null && (
        <QuotaPlanAllowedServersModal
          isOpen={true}
          planId={allowedServersPlan.id}
          planName={allowedServersPlan.name ?? `Plan #${allowedServersPlan.id}`}
          onClose={() => setAllowedServersPlan(null)}
        />
      )}
    </div>
  );
}

export default QuotaPlansSettings;

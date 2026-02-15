import { useEffect } from "react";
import type {
  CreateOrUpdateQuotaPlanRequest,
  QuotaPlanDto,
  QuotaOverlimitAction,
} from "../../api/orval/model";
import { QuotaOverlimitAction as OverlimitActionEnum } from "../../api/orval/model";

const OVERLIMIT_LABELS: Record<number, string> = {
  0: "None",
  1: "Throttle",
  2: "Block",
  3: "Notify",
};

type QuotaPlanFormModalProps = {
  isOpen: boolean;
  editPlan: QuotaPlanDto | null;
  onClose: () => void;
  onSubmit: (data: CreateOrUpdateQuotaPlanRequest) => void;
  isSubmitting: boolean;
};

const emptyForm = (): CreateOrUpdateQuotaPlanRequest => ({
  name: "",
  description: null,
  dailyQuotaBytes: null,
  monthlyQuotaBytes: null,
  upKbps: null,
  downKbps: null,
  overlimitAction: OverlimitActionEnum.NUMBER_0,
  throttleUpKbps: null,
  throttleDownKbps: null,
  isActive: true,
  isDefault: false,
});

export function QuotaPlanFormModal({
  isOpen,
  editPlan,
  onClose,
  onSubmit,
  isSubmitting,
}: QuotaPlanFormModalProps) {
  useEffect(() => {
    if (!isOpen) return;
    const form = document.getElementById("quota-plan-form") as HTMLFormElement;
    if (form) form.reset();
  }, [isOpen, editPlan]);

  if (!isOpen) return null;

  const initial = editPlan
    ? {
        id: editPlan.id,
        name: editPlan.name ?? "",
        description: editPlan.description ?? null,
        dailyQuotaBytes: editPlan.dailyQuotaBytes ?? null,
        monthlyQuotaBytes: editPlan.monthlyQuotaBytes ?? null,
        upKbps: editPlan.upKbps ?? null,
        downKbps: editPlan.downKbps ?? null,
        overlimitAction: (editPlan.overlimitAction ?? OverlimitActionEnum.NUMBER_0) as QuotaOverlimitAction,
        throttleUpKbps: editPlan.throttleUpKbps ?? null,
        throttleDownKbps: editPlan.throttleDownKbps ?? null,
        isActive: editPlan.isActive ?? true,
        isDefault: editPlan.isDefault ?? false,
      }
    : emptyForm();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const getNum = (name: string): number | null => {
      const v = form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value;
      if (v === "" || v == null) return null;
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    };
    const getStr = (name: string): string =>
      form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.value?.trim() ?? "";
    const getBool = (name: string): boolean =>
      (form.querySelector<HTMLInputElement>(`[name="${name}"]`)?.checked ?? false);
    const idRaw = form.querySelector<HTMLInputElement>('[name="id"]')?.value;
    const id = idRaw ? Number(idRaw) : undefined;

    const data: CreateOrUpdateQuotaPlanRequest = {
      id: Number.isFinite(id) ? id : undefined,
      name: getStr("name") || "Unnamed",
      description: getStr("description") || null,
      dailyQuotaBytes: getNum("dailyQuotaBytes"),
      monthlyQuotaBytes: getNum("monthlyQuotaBytes"),
      upKbps: getNum("upKbps"),
      downKbps: getNum("downKbps"),
      overlimitAction: (getNum("overlimitAction") ?? OverlimitActionEnum.NUMBER_0) as QuotaOverlimitAction,
      throttleUpKbps: getNum("throttleUpKbps"),
      throttleDownKbps: getNum("throttleDownKbps"),
      isActive: getBool("isActive"),
      isDefault: getBool("isDefault"),
    };
    onSubmit(data);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content quota-plan-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{editPlan ? "Edit quota plan" : "Add quota plan"}</h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <form id="quota-plan-form" onSubmit={handleSubmit}>
          {editPlan?.id != null && (
            <input type="hidden" name="id" value={editPlan.id} readOnly />
          )}
          <div className="form-row">
            <label>Name *</label>
            <input
              name="name"
              type="text"
              defaultValue={initial.name}
              required
              maxLength={64}
              placeholder="Plan name"
              className="input"
            />
          </div>
          <div className="form-row">
            <label>Description</label>
            <input
              name="description"
              type="text"
              defaultValue={initial.description ?? ""}
              maxLength={256}
              placeholder="Optional description"
              className="input"
            />
          </div>
          <div className="form-row two-cols">
            <div>
              <label>Daily quota (bytes)</label>
              <input
                name="dailyQuotaBytes"
                type="number"
                min={0}
                defaultValue={initial.dailyQuotaBytes ?? ""}
                placeholder="Optional"
                className="input"
              />
            </div>
            <div>
              <label>Monthly quota (bytes)</label>
              <input
                name="monthlyQuotaBytes"
                type="number"
                min={0}
                defaultValue={initial.monthlyQuotaBytes ?? ""}
                placeholder="Optional"
                className="input"
              />
            </div>
          </div>
          <div className="form-row two-cols">
            <div>
              <label>Upload (Kbps)</label>
              <input
                name="upKbps"
                type="number"
                min={0}
                defaultValue={initial.upKbps ?? ""}
                placeholder="Optional"
                className="input"
              />
            </div>
            <div>
              <label>Download (Kbps)</label>
              <input
                name="downKbps"
                type="number"
                min={0}
                defaultValue={initial.downKbps ?? ""}
                placeholder="Optional"
                className="input"
              />
            </div>
          </div>
          <div className="form-row">
            <label>Overlimit action</label>
            <select
              name="overlimitAction"
              defaultValue={String(initial.overlimitAction)}
              className="input"
            >
              {Object.entries(OVERLIMIT_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row two-cols">
            <div>
              <label>Throttle upload (Kbps)</label>
              <input
                name="throttleUpKbps"
                type="number"
                min={0}
                defaultValue={initial.throttleUpKbps ?? ""}
                placeholder="Optional"
                className="input"
              />
            </div>
            <div>
              <label>Throttle download (Kbps)</label>
              <input
                name="throttleDownKbps"
                type="number"
                min={0}
                defaultValue={initial.throttleDownKbps ?? ""}
                placeholder="Optional"
                className="input"
              />
            </div>
          </div>
          <div className="form-row checkbox-row">
            <label className="checkbox-label">
              <input
                name="isActive"
                type="checkbox"
                defaultChecked={initial.isActive}
                className="input"
              />
              Active
            </label>
            <label className="checkbox-label">
              <input
                name="isDefault"
                type="checkbox"
                defaultChecked={initial.isDefault}
                className="input"
              />
              Default plan
            </label>
          </div>
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn primary" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : editPlan ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

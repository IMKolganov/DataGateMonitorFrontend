import { FaClipboardList, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import type {
  CreateOrUpdateUserQuotaPlanRequest,
  UserQuotaPlanDto,
  QuotaPlanDto,
} from "../../api/orval/model";

type Props = {
  isOpen: boolean;
  userId: number;
  plans: QuotaPlanDto[];
  editItem: UserQuotaPlanDto | null;
  onClose: () => void;
  onSubmit: (data: CreateOrUpdateUserQuotaPlanRequest) => void;
  isSubmitting: boolean;
};

function toDateInputValue(s: string | null | undefined): string {
  if (!s) return "";
  try {
    const d = new Date(s);
    return Number.isFinite(d.getTime()) ? d.toISOString().slice(0, 10) : "";
  } catch {
    return "";
  }
}

export function UserQuotaPlanAssignmentModal({
  isOpen,
  userId,
  plans,
  editItem,
  onClose,
  onSubmit,
  isSubmitting,
}: Props) {
  if (!isOpen) return null;

  const isEdit = editItem != null && (editItem.id ?? 0) > 0;
  const initialQuotaPlanId = editItem?.quotaPlanId ?? (plans[0]?.id ?? 0);
  const initialFrom = toDateInputValue(editItem?.effectiveFrom);
  const initialTo = toDateInputValue(editItem?.effectiveTo ?? null);
  const initialNote = editItem?.note ?? "";

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const quotaPlanId = Number(
      (form.querySelector('[name="quotaPlanId"]') as HTMLSelectElement)?.value
    );
    const effectiveFrom = (
      form.querySelector('[name="effectiveFrom"]') as HTMLInputElement
    )?.value?.trim();
    const effectiveTo = (
      form.querySelector('[name="effectiveTo"]') as HTMLInputElement
    )?.value?.trim();
    const note = (
      form.querySelector('[name="note"]') as HTMLInputElement
    )?.value?.trim();

    if (!quotaPlanId || !effectiveFrom) return;

    const data: CreateOrUpdateUserQuotaPlanRequest = {
      id: isEdit ? editItem.id : undefined,
      userId,
      quotaPlanId,
      effectiveFrom: effectiveFrom || undefined,
      effectiveTo: effectiveTo ? effectiveTo : null,
      note: note || null,
    };
    onSubmit(data);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content quota-plan-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <h3 className="settings-card__h3-with-icon">
            {isEdit ? <FaEdit className="icon" aria-hidden /> : <FaClipboardList className="icon" aria-hidden />}
            <span>{isEdit ? "Edit assignment" : "Assign quota plan"}</span>
          </h3>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            &times;
          </button>
        </div>
        <form id="user-quota-assignment-form" onSubmit={handleSubmit}>
          <div className="form-row">
            <label htmlFor="user-quota-plan">Quota plan</label>
            <select
              id="user-quota-plan"
              name="quotaPlanId"
              className="input"
              required
              defaultValue={initialQuotaPlanId}
            >
              {plans.map((p) => (
                <option key={p.id} value={p.id ?? 0}>
                  {p.name ?? `Plan #${p.id}`}
                </option>
              ))}
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="user-quota-from">Effective from</label>
            <input
              id="user-quota-from"
              name="effectiveFrom"
              type="date"
              className="input"
              required
              defaultValue={initialFrom}
            />
          </div>
          <div className="form-row">
            <label htmlFor="user-quota-to">Effective to (optional)</label>
            <input
              id="user-quota-to"
              name="effectiveTo"
              type="date"
              className="input"
              defaultValue={initialTo}
            />
          </div>
          <div className="form-row">
            <label htmlFor="user-quota-note">Note (optional)</label>
            <input
              id="user-quota-note"
              name="note"
              type="text"
              className="input"
              maxLength={256}
              placeholder="Optional note"
              defaultValue={initialNote}
            />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn secondary" onClick={onClose}>
              <FaTimes className="icon" aria-hidden /> Cancel
            </button>
            <button type="submit" className="btn primary" disabled={isSubmitting}>
              <FaSave className="icon" aria-hidden />
              {isSubmitting ? "Saving…" : isEdit ? "Update" : "Assign"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default UserQuotaPlanAssignmentModal;

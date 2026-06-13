import { useMemo, useState } from "react";
import { FaEnvelope, FaPaperPlane, FaPlus, FaSync, FaSave, FaFileImport } from "react-icons/fa";
import { toast } from "react-toastify";
import type { GridColDef } from "@mui/x-data-grid";
import StyledDataGrid from "../components/ui/TableStyle.tsx";
import CustomThemeProvider from "../components/ui/ThemeProvider.tsx";
import {
  getApiAdminEmailBroadcastTemplatesId,
  useDeleteApiAdminEmailBroadcastTemplatesId,
  useGetApiAdminEmailBroadcastHistory,
  useGetApiAdminEmailBroadcastTemplates,
  usePostApiAdminEmailBroadcastSend,
  usePostApiAdminEmailBroadcastTemplates,
  usePutApiAdminEmailBroadcastTemplatesId,
} from "../api/orval/admin-email-broadcast/admin-email-broadcast";
import type { EmailBroadcastResponsesDtoEmailBroadcastTemplateDto } from "../api/orval/model/emailBroadcastResponsesDtoEmailBroadcastTemplateDto";
import type { EmailBroadcastResponsesDtoEmailBroadcastTemplateSummaryDto } from "../api/orval/model/emailBroadcastResponsesDtoEmailBroadcastTemplateSummaryDto";
import type { EmailBroadcastResponsesDtoSentEmailLogDto } from "../api/orval/model/emailBroadcastResponsesDtoSentEmailLogDto";
import type { EmailBroadcastResponsesGetEmailTemplatesResponse } from "../api/orval/model/emailBroadcastResponsesGetEmailTemplatesResponse";
import type { EmailBroadcastResponsesSendAdminEmailResponse } from "../api/orval/model/emailBroadcastResponsesSendAdminEmailResponse";
import type { SentEmailLogDto } from "../api/orvalModelShim";
import { formatDateWithOffset } from "../utils/utils.ts";
import { usePersistedPageSize } from "../hooks/usePersistedPageSize.ts";
import "../css/Settings.css";
import "../css/Table.css";

/** Default starter HTML for the broadcast editor. */
const defaultHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="color-scheme" content="light dark" />
  <meta name="supported-color-schemes" content="light dark" />
  <title>DataGate - email template</title>
  <style type="text/css">
    html, body {
      margin: 0 !important;
      padding: 0 !important;
      width: 100% !important;
      -webkit-text-size-adjust: 100%;
      -ms-text-size-adjust: 100%;
    }

    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
      font-size: 16px;
      line-height: 1.55;
      color: #1f2328;
      background-color: #f6f8fa;
    }

    .wrap { width: 100%; background-color: #f6f8fa; }
    .shell { max-width: 600px; margin: 0 auto; }

    .card {
      background-color: #ffffff;
      border: 1px solid #d0d7de;
      border-radius: 12px;
      overflow: hidden;
    }

    .accent {
      height: 4px;
      line-height: 0;
      font-size: 0;
      background: linear-gradient(90deg, #238636, #2ea043);
    }

    .pad { padding: 28px 24px 24px; }

    .email-title {
      margin: 0 0 4px;
      font-size: 22px;
      font-weight: 600;
      color: #1f2328;
      letter-spacing: -0.02em;
    }

    .email-tagline {
      margin: 0 0 24px;
      font-size: 13px;
      color: #656d76;
    }

    .email-lead {
      margin: 0 0 16px;
      font-size: 16px;
      font-weight: 500;
      color: #24292f;
    }

    .email-body {
      margin: 0 0 16px;
      font-size: 15px;
      color: #424a53;
      line-height: 1.55;
    }

    .email-body:last-of-type { margin-bottom: 0; }

    .email-body a {
      color: #0969da;
      text-decoration: none;
      font-weight: 500;
    }

    .email-body a:hover { text-decoration: underline; }

    .email-signoff {
      margin: 0;
      font-size: 15px;
      color: #424a53;
      line-height: 1.55;
    }

    .btn-wrap { margin-top: 16px; margin-bottom: 8px; }

    .btn {
      display: inline-block;
      padding: 10px 18px;
      font-size: 14px;
      font-weight: 600;
      text-decoration: none;
      border-radius: 8px;
      background-color: #238636;
      color: #ffffff !important;
      border: 1px solid #2ea043;
    }

    .footer {
      padding: 20px 24px 28px;
      font-size: 12px;
      line-height: 1.5;
      color: #656d76;
      text-align: center;
      border-top: 1px solid #d0d7de;
      background-color: #f6f8fa;
    }

    .footer a { color: #0969da; text-decoration: none; font-weight: 500; }

    .footer-muted { margin-bottom: 8px; }

    @media (prefers-color-scheme: dark) {
      body {
        color: #e6edf3 !important;
        background-color: #0d1117 !important;
      }
      .wrap { background-color: #0d1117 !important; }
      .card {
        background-color: #161b22 !important;
        border-color: #30363d !important;
      }
      .email-title { color: #f0f6fc !important; }
      .email-tagline { color: #9da7b3 !important; }
      .email-lead { color: #e6edf3 !important; }
      .email-body,
      .email-signoff {
        color: #c9d1d9 !important;
      }
      .email-body a { color: #79c0ff !important; }
      .footer {
        color: #9da7b3 !important;
        border-top-color: #30363d !important;
        background-color: #0d1117 !important;
      }
      .footer a { color: #79c0ff !important; }
    }

    @media only screen and (max-width: 620px) {
      .pad { padding: 22px 18px 18px !important; }
      .email-title { font-size: 20px !important; }
      .btn { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body>
<table role="presentation" class="wrap" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" class="shell" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
        <tr>
          <td>
            <table role="presentation" class="card" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#ffffff;border:1px solid #d0d7de;border-radius:12px;">
              <tr>
                <td class="accent">&nbsp;</td>
              </tr>
              <tr>
                <td class="pad">
                  <p class="email-title">Basic DataGate template</p>
                  <p class="email-tagline">Replace text below and save if needed.</p>

                  <div class="btn-wrap">
                    <a class="btn" href="https://datagateapp.com/download" target="_blank" rel="noopener noreferrer">
                      Optional call to action
                    </a>
                  </div>

                  <br />
                  <p class="email-lead">Hello,</p>
                  <p class="email-body">This is a base email template. Replace this text with your actual message content.</p>
                  <p class="email-body">You can edit the title, body, links, and footer before sending or saving this template.</p>
                  <p class="email-signoff">- The DataGate team</p>
                </td>
              </tr>
              <tr>
                <td class="footer">
                  <div class="footer-muted">
                    Open clients and server-side tools for full control of your VPN
                  </div>
                  <div class="footer-muted">
                    <a href="https://datagateapp.com/" target="_blank" rel="noopener noreferrer">datagateapp.com</a>
                  </div>
                  <div>&copy; 2026 DataGate</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>`;

/** Same idea as Events.tsx: API may return camelCase or PascalCase after JSON options. */
function normalizeSentHistory(raw: unknown): {
  items: EmailBroadcastResponsesDtoSentEmailLogDto[];
  totalCount: number;
} {
  if (raw == null || typeof raw !== "object") {
    return { items: [], totalCount: 0 };
  }
  const o = raw as Record<string, unknown>;
  const itemsRaw = o.items ?? o.Items;
  const items = Array.isArray(itemsRaw)
    ? (itemsRaw as EmailBroadcastResponsesDtoSentEmailLogDto[])
    : [];
  const tc = o.totalCount ?? o.TotalCount;
  const totalCount =
    typeof tc === "number" && Number.isFinite(tc) ? Math.max(0, tc) : items.length;
  return { items, totalCount };
}

function unwrapTemplates(
  raw: unknown,
): EmailBroadcastResponsesGetEmailTemplatesResponse | undefined {
  return raw as EmailBroadcastResponsesGetEmailTemplatesResponse | undefined;
}

function unwrapTemplateDto(
  raw: unknown,
): EmailBroadcastResponsesDtoEmailBroadcastTemplateDto | undefined {
  return raw as EmailBroadcastResponsesDtoEmailBroadcastTemplateDto | undefined;
}

export default function EmailBroadcastSettings() {
  const [subject, setSubject] = useState("");
  const [htmlBody, setHtmlBody] = useState(defaultHtml);
  const [targetUserIdRaw, setTargetUserIdRaw] = useState("");
  const [previewHtml, setPreviewHtml] = useState(defaultHtml);

  const [historyPage, setHistoryPage] = useState(0);
  const [historyPageSize, setHistoryPageSize] = usePersistedPageSize(
    "email-broadcast-history",
    10,
    "5,10,20,50,100",
  );
  const [tplGridPage, setTplGridPage] = useState(0);
  const [tplPageSize, setTplPageSize] = usePersistedPageSize(
    "email-broadcast-templates",
    10,
    "5,10,20,50,100",
  );
  const [bodyDialog, setBodyDialog] = useState<SentEmailLogDto | null>(null);

  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplDescription, setTplDescription] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplHtml, setTplHtml] = useState(defaultHtml);

  const historyQueryParams = useMemo(
    () => ({ Page: historyPage + 1, PageSize: historyPageSize }),
    [historyPage, historyPageSize],
  );

  const historyQuery = useGetApiAdminEmailBroadcastHistory(historyQueryParams, {
    query: {
      placeholderData: (prev) => prev,
    },
  });

  const historyNormalized = useMemo(
    () => normalizeSentHistory(historyQuery.data),
    [historyQuery.data],
  );
  const rows = historyNormalized.items;
  const rowCount = historyNormalized.totalCount;
  const loading = historyQuery.isPending || historyQuery.isFetching;

  const maxHistoryPage = Math.max(0, Math.ceil(rowCount / historyPageSize) - 1);
  const [historyPageBounds, setHistoryPageBounds] = useState({ rowCount, maxHistoryPage });
  if (
    historyPageBounds.rowCount !== rowCount ||
    historyPageBounds.maxHistoryPage !== maxHistoryPage
  ) {
    setHistoryPageBounds({ rowCount, maxHistoryPage });
    if (rowCount <= 0) {
      if (historyPage !== 0) setHistoryPage(0);
    } else if (historyPage > maxHistoryPage) {
      setHistoryPage(maxHistoryPage);
    }
  }

  const templatesQuery = useGetApiAdminEmailBroadcastTemplates({});
  const templates = useMemo((): EmailBroadcastResponsesDtoEmailBroadcastTemplateSummaryDto[] => {
    const templatesPayload = unwrapTemplates(templatesQuery.data);
    return (templatesPayload?.items ?? []) as EmailBroadcastResponsesDtoEmailBroadcastTemplateSummaryDto[];
  }, [templatesQuery.data]);
  const templatesLoading = templatesQuery.isPending || templatesQuery.isFetching;

  const sendMutation = usePostApiAdminEmailBroadcastSend({
    mutation: {
      onSuccess: async () => {
        await historyQuery.refetch();
      },
    },
  });

  const createTplMutation = usePostApiAdminEmailBroadcastTemplates({
    mutation: {
      onSuccess: async () => {
        await templatesQuery.refetch();
      },
    },
  });

  const updateTplMutation = usePutApiAdminEmailBroadcastTemplatesId({
    mutation: {
      onSuccess: async () => {
        await templatesQuery.refetch();
      },
    },
  });

  const deleteTplMutation = useDeleteApiAdminEmailBroadcastTemplatesId({
    mutation: {
      onSuccess: async () => {
        await templatesQuery.refetch();
      },
    },
  });

  const openCreateTemplate = () => {
    setEditingTplId(null);
    setTplName("");
    setTplDescription("");
    setTplSubject("");
    setTplHtml(defaultHtml);
    setTplDialogOpen(true);
  };

  const openEditTemplate = async (id: number) => {
    try {
      const raw = await getApiAdminEmailBroadcastTemplatesId(id);
      const full = unwrapTemplateDto(raw);
      if (!full?.name) {
        toast.error("Invalid template response");
        return;
      }
      setEditingTplId(id);
      setTplName(full.name);
      setTplDescription(full.description ?? "");
      setTplSubject(full.subject ?? "");
      setTplHtml(full.bodyHtml ?? defaultHtml);
      setTplDialogOpen(true);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  };

  const saveTemplate = async () => {
    const name = tplName.trim();
    if (!name) {
      toast.error("Template name is required.");
      return;
    }
    if (!tplSubject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!tplHtml.trim()) {
      toast.error("HTML body is required.");
      return;
    }
    const body = {
      name,
      description: tplDescription.trim() || null,
      subject: tplSubject.trim(),
      htmlBody: tplHtml,
    };
    try {
      if (editingTplId == null) {
        await createTplMutation.mutateAsync({ data: body });
        toast.success("Template created.");
      } else {
        await updateTplMutation.mutateAsync({ id: editingTplId, data: body });
        toast.success("Template updated.");
      }
      setTplDialogOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Save failed");
    }
  };

  const removeTemplate = async (id: number, name: string) => {
    if (!window.confirm(`Delete template "${name}"?`)) return;
    try {
      await deleteTplMutation.mutateAsync({ id });
      toast.success("Deleted.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed");
    }
  };

  const applyTemplateToComposer = async (id: number) => {
    try {
      const raw = await getApiAdminEmailBroadcastTemplatesId(id);
      const full = unwrapTemplateDto(raw);
      if (!full?.name) {
        toast.error("Invalid template response");
        return;
      }
      setSubject(full.subject ?? "");
      setHtmlBody(full.bodyHtml ?? defaultHtml);
      setPreviewHtml(full.bodyHtml ?? defaultHtml);
      toast.success(`Loaded template "${full.name}" into the form.`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Load failed");
    }
  };

  const templateGridRows = useMemo(
    () =>
      templates.map((t) => ({
        id: t.id ?? 0,
        name: t.name ?? "",
        description: t.description ?? "",
        subject: t.subject ?? "",
        updated: t.lastUpdate ? formatDateWithOffset(new Date(t.lastUpdate)) : "",
      })),
    [templates],
  );

  const templateColumns: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 0.25, minWidth: 120 },
    { field: "subject", headerName: "Subject", flex: 0.3, minWidth: 140 },
    { field: "description", headerName: "Description", flex: 0.25, minWidth: 100 },
    { field: "updated", headerName: "Updated", flex: 0.2, minWidth: 140 },
    {
      field: "actions",
      headerName: "",
      width: 260,
      sortable: false,
      renderCell: (params) => {
        const id = Number(params.id);
        const name = String(params.row.name ?? "");
        return (
          <div className="action-container">
            <button type="button" className="btn secondary" onClick={() => void applyTemplateToComposer(id)}>
              Use
            </button>
            <button type="button" className="btn secondary" onClick={() => void openEditTemplate(id)}>
              Edit
            </button>
            <button type="button" className="btn danger" onClick={() => void removeTemplate(id, name)}>
              Delete
            </button>
          </div>
        );
      },
    },
  ];

  const gridRows = useMemo(
    () =>
      rows.map((r, idx) => ({
        id:
          r.id != null && Number.isFinite(Number(r.id))
            ? Number(r.id)
            : `log-${historyPage}-${historyPageSize}-${idx}-${String(r.createDate ?? "")}-${String(r.recipientEmail ?? "")}`,
        raw: r as SentEmailLogDto,
        createDate: r.createDate ? formatDateWithOffset(new Date(r.createDate)) : "",
        recipientEmail: r.recipientEmail,
        recipientUserId: r.recipientUserId ?? "",
        subject: r.subject,
        success: r.success ? "Yes" : "No",
        errorMessage: r.errorMessage ?? "",
      })),
    [rows, historyPage, historyPageSize],
  );

  const columns: GridColDef[] = [
    { field: "createDate", headerName: "Sent at", flex: 0.35, minWidth: 160 },
    { field: "recipientEmail", headerName: "To", flex: 0.35, minWidth: 180 },
    { field: "recipientUserId", headerName: "User Id", width: 90 },
    { field: "subject", headerName: "Subject", flex: 0.4, minWidth: 140 },
    { field: "success", headerName: "OK", width: 60 },
    { field: "errorMessage", headerName: "Error", flex: 0.35, minWidth: 120 },
    {
      field: "body",
      headerName: "HTML",
      width: 90,
      sortable: false,
      renderCell: (params) => {
        const raw = (params.row as { raw?: SentEmailLogDto }).raw;
        return (
          <button
            type="button"
            className="btn secondary"
            onClick={() => raw && setBodyDialog(raw)}
          >
            View
          </button>
        );
      },
    },
  ];

  const applyPreview = () => {
    setPreviewHtml(htmlBody);
  };

  const onSend = async () => {
    const t = targetUserIdRaw.trim();
    const parsed = t === "" ? NaN : parseInt(t, 10);
    const targetUserId = t === "" ? null : parsed;
    if (t !== "" && (!Number.isFinite(parsed) || parsed <= 0)) {
      toast.error("Target user id must be empty (all with email) or a positive integer.");
      return;
    }
    if (!subject.trim()) {
      toast.error("Subject is required.");
      return;
    }
    if (!htmlBody.trim()) {
      toast.error("HTML body is required.");
      return;
    }
    const scopeRu =
      targetUserId == null
        ? "всем пользователям панели, у кого в профиле указан email (массовая рассылка)"
        : `только одному пользователю с ID ${targetUserId}`;
    if (
      !window.confirm(
        `Вы уверены?\n\nБудет отправлено: ${scopeRu}.\nТема: «${subject.trim()}»`,
      )
    ) {
      return;
    }
    try {
      const res = await sendMutation.mutateAsync({
        data: {
          subject: subject.trim(),
          htmlBody,
          targetUserId,
        },
      });
      const sendPayload = res as unknown as EmailBroadcastResponsesSendAdminEmailResponse;
      const attempted = sendPayload?.attempted ?? 0;
      const succeeded = sendPayload?.succeeded ?? 0;
      const failed = sendPayload?.failed ?? 0;
      toast.success(`Done: ${succeeded} sent, ${failed} failed (${attempted} attempted).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    }
  };

  return (
    <>
      <h2 className="settings-page__h2-with-icon">
        <FaEnvelope className="icon" aria-hidden />
        <span>Email broadcast</span>
      </h2>

      <p className="settings-item-description" style={{ marginBottom: 20, maxWidth: 960 }}>
        Uses the configured email provider (SMTP or Resend). Save reusable layouts as templates, then use them in the
        composer.{" "}
        <strong>One recipient:</strong> enter their numeric user ID below (same as &quot;User Id&quot; in Sent mail log
        or in Users). <strong>Everyone:</strong> leave the field empty — email goes to all dashboard users who have an
        email saved.
      </p>

      <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
        <FaFileImport className="icon" aria-hidden />
        <span>Templates</span>
      </h3>
      <div className="header-bar" style={{ marginBottom: 12 }}>
        <div className="left-buttons">
          <button type="button" className="btn secondary" onClick={() => void templatesQuery.refetch()}>
            <FaSync className={`icon ${templatesLoading ? "icon-spin" : ""}`} aria-hidden /> Refresh
          </button>
          <button type="button" className="btn primary" onClick={openCreateTemplate}>
            <FaPlus className="icon" aria-hidden /> New template
          </button>
        </div>
      </div>
      <CustomThemeProvider>
        <div
          className="data-grid-wrap"
          style={{
            backgroundColor: "var(--bg-body)",
            padding: 10,
            borderRadius: 8,
            marginBottom: 32,
          }}
        >
          <StyledDataGrid
            rows={templateGridRows}
            columns={templateColumns}
            loading={templatesLoading}
            paginationMode="client"
            paginationModel={{ page: tplGridPage, pageSize: tplPageSize }}
            onPaginationModelChange={(m) => {
              setTplGridPage(m.page);
              setTplPageSize(m.pageSize);
            }}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            disableRowSelectionOnClick
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{ noRowsLabel: "No templates yet. Click «New template» to add one." }}
          />
        </div>
      </CustomThemeProvider>

      <div className="quota-plan-modal email-broadcast-composer" style={{ maxWidth: 960, marginBottom: 24 }}>
        <div className="form-row">
          <label htmlFor="email-broadcast-subject">Subject *</label>
          <input
            id="email-broadcast-subject"
            type="text"
            className="input"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            required
            autoComplete="off"
          />
        </div>
        <div className="form-row">
          <label htmlFor="email-broadcast-target-user">Target user ID (optional)</label>
          <input
            id="email-broadcast-target-user"
            type="text"
            inputMode="numeric"
            className="input"
            value={targetUserIdRaw}
            onChange={(e) => setTargetUserIdRaw(e.target.value)}
            placeholder="e.g. 42 = one user only; leave empty = all users with email"
            autoComplete="off"
          />
          <p className="settings-item-description" style={{ marginTop: 8, marginBottom: 0 }}>
            Один адресат — положительное целое число (ID пользователя в системе). Всем сразу — оставьте поле пустым.
          </p>
        </div>
        <div className="form-row">
          <label htmlFor="email-broadcast-html">HTML body *</label>
          <textarea
            id="email-broadcast-html"
            className="input"
            value={htmlBody}
            onChange={(e) => setHtmlBody(e.target.value)}
            required
            rows={12}
            style={{ minHeight: 260 }}
          />
        </div>
        <div className="settings-item" style={{ marginTop: 0, flexWrap: "wrap" }}>
          <button type="button" className="btn secondary" onClick={applyPreview}>
            <FaEnvelope className="icon" aria-hidden /> Refresh preview
          </button>
          <button
            type="button"
            className="btn primary"
            disabled={sendMutation.isPending}
            onClick={() => void onSend()}
          >
            <FaPaperPlane className="icon" aria-hidden /> Send
          </button>
        </div>
      </div>

      <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
        <span>Layout preview (sandboxed, scripts disabled)</span>
      </h3>
      <div
        style={{
          border: "1px solid var(--border-color)",
          borderRadius: 8,
          overflow: "hidden",
          marginBottom: 24,
          minHeight: 720,
          background: "var(--bg-card)",
        }}
      >
        <iframe
          title="email-preview"
          sandbox=""
          srcDoc={previewHtml || "<p></p>"}
          style={{ width: "100%", height: 800, border: "none", display: "block" }}
        />
      </div>

      <h3 className="settings-card__h3-with-icon" style={{ marginBottom: 12 }}>
        <FaSync className="icon" aria-hidden />
        <span>Sent mail log</span>
      </h3>
      <div className="header-bar" style={{ marginBottom: 12 }}>
        <div className="left-buttons">
          <button type="button" className="btn secondary" onClick={() => void historyQuery.refetch()}>
            <FaSync className={`icon ${loading ? "icon-spin" : ""}`} aria-hidden /> Refresh log
          </button>
        </div>
      </div>
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
            rows={gridRows}
            columns={columns}
            rowCount={rowCount}
            loading={loading}
            paginationMode="server"
            paginationModel={{ page: historyPage, pageSize: historyPageSize }}
            onPaginationModelChange={(m) => {
              setHistoryPage(m.page);
              setHistoryPageSize(m.pageSize);
            }}
            pageSizeOptions={[5, 10, 20, 50, 100]}
            disableRowSelectionOnClick
            slotProps={{ loadingOverlay: { variant: "skeleton", noRowsVariant: "skeleton" } }}
            localeText={{ noRowsLabel: "📭 No sent mail logged yet." }}
          />
        </div>
      </CustomThemeProvider>

      {bodyDialog != null && (
        <div className="modal-overlay" onClick={() => setBodyDialog(null)}>
          <div
            className="modal-content"
            style={{ maxWidth: 900, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3>Sent HTML — {bodyDialog.recipientEmail}</h3>
              <button type="button" className="modal-close" onClick={() => setBodyDialog(null)} aria-label="Close">
                ×
              </button>
            </div>
            <div style={{ padding: "0 20px 16px" }}>
              <p className="settings-item-description" style={{ marginBottom: 12 }}>
                {bodyDialog.subject}
              </p>
              <div
                style={{
                  border: "1px solid var(--border-color)",
                  borderRadius: 8,
                  overflow: "hidden",
                }}
              >
                <iframe
                  title="sent-html"
                  sandbox=""
                  srcDoc={bodyDialog.bodyHtml || "<p></p>"}
                  style={{ width: "100%", height: 360, border: "none", display: "block", background: "#ffffff" }}
                />
              </div>
            </div>
            <div className="modal-actions" style={{ padding: "0 20px 20px" }}>
              <button type="button" className="btn secondary" onClick={() => setBodyDialog(null)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {tplDialogOpen && (
        <div className="modal-overlay" onClick={() => setTplDialogOpen(false)}>
          <div
            className="modal-content quota-plan-modal"
            style={{ maxWidth: 720, width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="modal-header">
              <h3 className="settings-card__h3-with-icon">
                {editingTplId == null ? <FaPlus className="icon" aria-hidden /> : <FaSave className="icon" aria-hidden />}
                <span>{editingTplId == null ? "New template" : `Edit template #${editingTplId}`}</span>
              </h3>
              <button type="button" className="modal-close" onClick={() => setTplDialogOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void saveTemplate();
              }}
            >
              <div className="form-row">
                <label htmlFor="tpl-name">Name *</label>
                <input
                  id="tpl-name"
                  type="text"
                  className="input"
                  value={tplName}
                  onChange={(e) => setTplName(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-row">
                <label htmlFor="tpl-description">Description</label>
                <input
                  id="tpl-description"
                  type="text"
                  className="input"
                  value={tplDescription}
                  onChange={(e) => setTplDescription(e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="form-row">
                <label htmlFor="tpl-subject">Subject *</label>
                <input
                  id="tpl-subject"
                  type="text"
                  className="input"
                  value={tplSubject}
                  onChange={(e) => setTplSubject(e.target.value)}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="form-row">
                <label htmlFor="tpl-html">HTML body *</label>
                <textarea
                  id="tpl-html"
                  className="input"
                  value={tplHtml}
                  onChange={(e) => setTplHtml(e.target.value)}
                  required
                  rows={10}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn secondary" onClick={() => setTplDialogOpen(false)}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn primary"
                  disabled={createTplMutation.isPending || updateTplMutation.isPending}
                >
                  <FaSave className="icon" aria-hidden /> Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

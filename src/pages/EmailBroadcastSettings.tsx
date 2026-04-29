import { useMemo, useState } from "react";
import { FaEnvelope, FaPaperPlane, FaPlus, FaSync, FaSave, FaFileImport } from "react-icons/fa";
import { toast } from "react-toastify";
import type { GridColDef } from "@mui/x-data-grid";
import {
  TextField,
  Button,
  Box,
  Typography,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
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
import type { EmailBroadcastResponsesGetSentEmailHistoryResponse } from "../api/orval/model/emailBroadcastResponsesGetSentEmailHistoryResponse";
import type { EmailBroadcastResponsesSendAdminEmailResponse } from "../api/orval/model/emailBroadcastResponsesSendAdminEmailResponse";
import type { SentEmailLogDto } from "../api/orvalModelShim";
import { formatDateWithOffset } from "../utils/utils.ts";
import "../css/Settings.css";
import "../css/Table.css";

const defaultHtml = "<p>Hello,</p>\n<p></p>\n<p>— DataGateMonitor</p>";

function unwrapHistory(
  raw: unknown,
): EmailBroadcastResponsesGetSentEmailHistoryResponse | undefined {
  return raw as EmailBroadcastResponsesGetSentEmailHistoryResponse | undefined;
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

  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(20);
  const [bodyDialog, setBodyDialog] = useState<SentEmailLogDto | null>(null);

  const [tplDialogOpen, setTplDialogOpen] = useState(false);
  const [editingTplId, setEditingTplId] = useState<number | null>(null);
  const [tplName, setTplName] = useState("");
  const [tplDescription, setTplDescription] = useState("");
  const [tplSubject, setTplSubject] = useState("");
  const [tplHtml, setTplHtml] = useState(defaultHtml);

  const historyQuery = useGetApiAdminEmailBroadcastHistory(
    { Page: page + 1, PageSize: pageSize },
    {},
  );
  const historyPayload = unwrapHistory(historyQuery.data);
  const rows: EmailBroadcastResponsesDtoSentEmailLogDto[] =
    (historyPayload?.items ?? []) as EmailBroadcastResponsesDtoSentEmailLogDto[];
  const rowCount = historyPayload?.totalCount ?? 0;
  const loading = historyQuery.isPending || historyQuery.isFetching;

  const templatesQuery = useGetApiAdminEmailBroadcastTemplates({});
  const templatesPayload = unwrapTemplates(templatesQuery.data);
  const templates: EmailBroadcastResponsesDtoEmailBroadcastTemplateSummaryDto[] =
    (templatesPayload?.items ?? []) as EmailBroadcastResponsesDtoEmailBroadcastTemplateSummaryDto[];
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
      width: 220,
      sortable: false,
      renderCell: (params) => {
        const id = Number(params.id);
        const name = String(params.row.name ?? "");
        return (
          <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
            <Button size="small" variant="text" onClick={() => void applyTemplateToComposer(id)}>
              Use
            </Button>
            <Button size="small" variant="text" onClick={() => void openEditTemplate(id)}>
              Edit
            </Button>
            <Button size="small" color="error" variant="text" onClick={() => void removeTemplate(id, name)}>
              Delete
            </Button>
          </Box>
        );
      },
    },
  ];

  const gridRows = useMemo(
    () =>
      rows.map((r) => ({
        id: r.id,
        createDate: r.createDate ? formatDateWithOffset(new Date(r.createDate)) : "",
        recipientEmail: r.recipientEmail,
        recipientUserId: r.recipientUserId ?? "",
        subject: r.subject,
        success: r.success ? "Yes" : "No",
        errorMessage: r.errorMessage ?? "",
      })),
    [rows],
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
        const row = rows.find((x) => x.id === params.id);
        return (
          <Button size="small" variant="text" onClick={() => row && setBodyDialog(row as SentEmailLogDto)}>
            View
          </Button>
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
    const scope =
      targetUserId == null
        ? "ALL users that have an email address"
        : `user id ${targetUserId} only`;
    if (!window.confirm(`Send this email to ${scope}?\n\nSubject: ${subject.trim()}`)) return;
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
    <div className="content-wrapper wide-table settings">
      <h2 className="settings-page__h2-with-icon">
        <FaEnvelope className="icon" aria-hidden />
        <span>Email broadcast</span>
      </h2>

      <Alert severity="info" sx={{ mb: 2 }}>
        Uses the configured email provider (SMTP or Resend). Save reusable layouts as templates, then Use them in
        the composer. Leave &quot;Target user id&quot; empty to mail everyone with a non-empty email.
      </Alert>

      <Typography variant="subtitle1" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <FaFileImport /> Templates
      </Typography>
      <Box sx={{ mb: 1, display: "flex", gap: 1, flexWrap: "wrap" }}>
        <Button variant="contained" size="small" startIcon={<FaPlus />} onClick={openCreateTemplate}>
          New template
        </Button>
        <Button variant="outlined" size="small" startIcon={<FaSync />} onClick={() => void templatesQuery.refetch()}>
          Refresh
        </Button>
      </Box>
      <CustomThemeProvider>
        <StyledDataGrid
          rows={templateGridRows}
          columns={templateColumns}
          loading={templatesLoading}
          hideFooter
          disableRowSelectionOnClick
          autoHeight
          sx={{ mb: 4 }}
        />
      </CustomThemeProvider>

      <Box sx={{ display: "flex", flexDirection: "column", gap: 2, maxWidth: 960, mb: 3 }}>
        <TextField
          label="Subject"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          fullWidth
          required
        />
        <TextField
          label="Target user id (optional)"
          value={targetUserIdRaw}
          onChange={(e) => setTargetUserIdRaw(e.target.value)}
          helperText="Empty = all dashboard users with email"
          fullWidth
        />
        <TextField
          label="HTML body"
          value={htmlBody}
          onChange={(e) => setHtmlBody(e.target.value)}
          multiline
          minRows={10}
          fullWidth
          required
        />
        <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
          <Button variant="outlined" startIcon={<FaEnvelope />} onClick={applyPreview}>
            Refresh preview
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<FaPaperPlane />}
            disabled={sendMutation.isPending}
            onClick={() => void onSend()}
          >
            Send
          </Button>
        </Box>
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1 }}>
        Layout preview (sandboxed, scripts disabled)
      </Typography>
      <Box
        sx={{
          border: "1px solid #30363d",
          borderRadius: 1,
          overflow: "hidden",
          mb: 3,
          minHeight: 200,
          background: "#fff",
        }}
      >
        <iframe
          title="email-preview"
          sandbox=""
          srcDoc={previewHtml || "<p></p>"}
          style={{ width: "100%", height: 280, border: "none", display: "block" }}
        />
      </Box>

      <Typography variant="subtitle1" sx={{ mb: 1, display: "flex", alignItems: "center", gap: 1 }}>
        <FaSync /> Sent mail log
      </Typography>
      <Box sx={{ mb: 1 }}>
        <Button variant="outlined" size="small" startIcon={<FaSync />} onClick={() => void historyQuery.refetch()}>
          Refresh log
        </Button>
      </Box>
      <CustomThemeProvider>
        <StyledDataGrid
          rows={gridRows}
          columns={columns}
          rowCount={rowCount}
          loading={loading}
          paginationMode="server"
          paginationModel={{ page, pageSize }}
          onPaginationModelChange={(m) => {
            setPage(m.page);
            setPageSize(m.pageSize);
          }}
          pageSizeOptions={[10, 20, 50]}
          disableRowSelectionOnClick
          autoHeight
        />
      </CustomThemeProvider>

      <Dialog open={bodyDialog != null} onClose={() => setBodyDialog(null)} maxWidth="md" fullWidth>
        <DialogTitle>Sent HTML — {bodyDialog?.recipientEmail}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
            {bodyDialog?.subject}
          </Typography>
          <Box sx={{ border: 1, borderColor: "divider", borderRadius: 1, overflow: "hidden" }}>
            <iframe
              title="sent-html"
              sandbox=""
              srcDoc={bodyDialog?.bodyHtml || "<p></p>"}
              style={{ width: "100%", height: 360, border: "none", display: "block", background: "#fff" }}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBodyDialog(null)}>Close</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={tplDialogOpen} onClose={() => setTplDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingTplId == null ? "New template" : `Edit template #${editingTplId}`}</DialogTitle>
        <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2, pt: 1 }}>
          <TextField label="Name" value={tplName} onChange={(e) => setTplName(e.target.value)} required fullWidth />
          <TextField
            label="Description"
            value={tplDescription}
            onChange={(e) => setTplDescription(e.target.value)}
            fullWidth
          />
          <TextField
            label="Subject"
            value={tplSubject}
            onChange={(e) => setTplSubject(e.target.value)}
            required
            fullWidth
          />
          <TextField
            label="HTML body"
            value={tplHtml}
            onChange={(e) => setTplHtml(e.target.value)}
            multiline
            minRows={8}
            fullWidth
            required
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTplDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            startIcon={<FaSave />}
            disabled={createTplMutation.isPending || updateTplMutation.isPending}
            onClick={() => void saveTemplate()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}

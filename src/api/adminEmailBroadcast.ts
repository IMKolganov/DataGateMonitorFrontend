import axios from "axios";
import { apiRequest } from "./apirequest.ts";

export type SentEmailLogDto = {
  id: number;
  createDate: string;
  recipientUserId: number | null;
  recipientEmail: string;
  subject: string;
  bodyHtml: string;
  success: boolean;
  errorMessage: string | null;
  sentByUserId: number | null;
};

export type GetSentEmailHistoryResponse = {
  page: number;
  pageSize: number;
  totalCount: number;
  items: SentEmailLogDto[];
};

export type SendAdminEmailResponse = {
  attempted: number;
  succeeded: number;
  failed: number;
};

type ApiEnvelope<T> = { success?: boolean; message?: string; data?: T };

function unwrap<T>(raw: ApiEnvelope<T>): T {
  if (!raw || typeof raw !== "object" || !("data" in raw))
    throw new Error("Invalid API response");
  if (raw.success === false)
    throw new Error(raw.message || "Request failed");
  return raw.data as T;
}

function rethrowApiError(err: unknown): never {
  if (axios.isAxiosError(err) && err.response?.data && typeof err.response.data === "object") {
    const d = err.response.data as { message?: string; Message?: string };
    const msg = d.message ?? d.Message;
    if (msg) throw new Error(msg);
  }
  throw err instanceof Error ? err : new Error(String(err));
}

export async function fetchEmailHistory(page: number, pageSize: number): Promise<GetSentEmailHistoryResponse> {
  const q = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
  try {
    const res = await apiRequest<GetSentEmailHistoryResponse>(
      "get",
      `/api/admin/email-broadcast/history?${q.toString()}`,
    );
    return unwrap(res as ApiEnvelope<GetSentEmailHistoryResponse>);
  } catch (e) {
    rethrowApiError(e);
  }
}

export async function sendAdminEmail(body: {
  subject: string;
  htmlBody: string;
  targetUserId: number | null;
}): Promise<SendAdminEmailResponse> {
  try {
    const res = await apiRequest<SendAdminEmailResponse>("post", "/api/admin/email-broadcast/send", {
      data: {
        subject: body.subject,
        htmlBody: body.htmlBody,
        targetUserId: body.targetUserId,
      },
    });
    return unwrap(res as ApiEnvelope<SendAdminEmailResponse>);
  } catch (e) {
    rethrowApiError(e);
  }
}

// --- Templates ---

export type EmailBroadcastTemplateSummaryDto = {
  id: number;
  name: string;
  description: string | null;
  subject: string;
  createDate: string;
  lastUpdate: string;
};

export type EmailBroadcastTemplateDto = EmailBroadcastTemplateSummaryDto & {
  bodyHtml: string;
  createdByUserId: number | null;
};

export type GetEmailTemplatesResponse = {
  items: EmailBroadcastTemplateSummaryDto[];
};

export async function fetchEmailTemplates(): Promise<EmailBroadcastTemplateSummaryDto[]> {
  try {
    const res = await apiRequest<GetEmailTemplatesResponse>("get", "/api/admin/email-broadcast/templates");
    const data = unwrap(res as ApiEnvelope<GetEmailTemplatesResponse>);
    return data.items ?? [];
  } catch (e) {
    rethrowApiError(e);
  }
}

export async function fetchEmailTemplateById(id: number): Promise<EmailBroadcastTemplateDto> {
  try {
    const res = await apiRequest<EmailBroadcastTemplateDto>(
      "get",
      `/api/admin/email-broadcast/templates/${id}`,
    );
    return unwrap(res as ApiEnvelope<EmailBroadcastTemplateDto>);
  } catch (e) {
    rethrowApiError(e);
  }
}

export async function createEmailTemplate(body: {
  name: string;
  description: string | null;
  subject: string;
  htmlBody: string;
}): Promise<EmailBroadcastTemplateDto> {
  try {
    const res = await apiRequest<EmailBroadcastTemplateDto>("post", "/api/admin/email-broadcast/templates", {
      data: {
        name: body.name,
        description: body.description,
        subject: body.subject,
        htmlBody: body.htmlBody,
      },
    });
    return unwrap(res as ApiEnvelope<EmailBroadcastTemplateDto>);
  } catch (e) {
    rethrowApiError(e);
  }
}

export async function updateEmailTemplate(
  id: number,
  body: { name: string; description: string | null; subject: string; htmlBody: string },
): Promise<EmailBroadcastTemplateDto> {
  try {
    const res = await apiRequest<EmailBroadcastTemplateDto>(
      "put",
      `/api/admin/email-broadcast/templates/${id}`,
      { data: body },
    );
    return unwrap(res as ApiEnvelope<EmailBroadcastTemplateDto>);
  } catch (e) {
    rethrowApiError(e);
  }
}

export async function deleteEmailTemplate(id: number): Promise<void> {
  try {
    const res = await apiRequest<boolean>("delete", `/api/admin/email-broadcast/templates/${id}`);
    unwrap(res as ApiEnvelope<boolean>);
  } catch (e) {
    rethrowApiError(e);
  }
}

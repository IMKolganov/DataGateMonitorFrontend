// src/pages/ServerForm.tsx
import React from "react";
import { useNavigate, useParams } from "react-router-dom";
import "../css/ServerForm.css";
import "../css/OvpnFileConfigForm.css";
import { FaArrowLeft, FaPlus, FaCopy, FaCheckCircle, FaTrash } from "react-icons/fa";
import { toast } from "react-toastify";

import {
  useGetApiOpenVpnServersGetVpnServerId,
  usePostApiOpenVpnServersAdd,
  usePutApiOpenVpnServersUpdate,
  getApiOpenVpnServersGetVpnServerId,
  getApiOpenVpnServersGetMicroserviceInfoByUrl,
  getApiOpenVpnServersPostSetupVpnServerIdStatus,
  postApiOpenVpnServersPostSetupVpnServerIdStart,
} from "../api/orval/vpn-servers/vpn-servers";

import {
  useGetApiOpenVpnConfigsGetVpnServerId,
  usePostApiOpenVpnConfigsAddUpdate,
} from "../api/orval/vpn-server-ovpn-file-config/vpn-server-ovpn-file-config";

import {
  useGetApiTagsGetAll,
  usePostApiTagsCreate,
  useDeleteApiTagsDeleteId,
  getGetApiTagsGetAllQueryKey,
} from "../api/orval/tags/tags";
import { useQueryClient } from "@tanstack/react-query";

import type {
  AddServerRequest,
  UpdateServerRequest,
  VpnServerDto,
  VpnServerType as OrvalVpnServerType,
  QuotaPlanDto,
  QuotaPlansResponse,
  QuotaPlanAllowedServerDto,
  VpnServerResponse,
  GetApiOpenVpnServersGetMicroserviceInfoByUrlParams,
} from "../api/orvalModelShim";
import { VpnServersResponsesVpnServerPostSetupState } from "../api/orval/model/vpnServersResponsesVpnServerPostSetupState";
import type { VpnServersResponsesVpnServerPostSetupStatusResponse } from "../api/orval/model/vpnServersResponsesVpnServerPostSetupStatusResponse";
import { highlightOvpnConfig } from "../utils/ovpnConfigHighlight";
import {
  OPEN_VPN_EXPORT_TEMPLATE,
  unwrapOvpnFileConfigPayload,
} from "../utils/exportConfigTemplates";
import { usePostApiQuotaPlansGetAll } from "../api/orval/quota-plan/quota-plan";
import {
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId,
  postApiQuotaPlanAllowedServersCreate,
  deleteApiQuotaPlanAllowedServersDeleteId,
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey,
} from "../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import { getGetApiV3OpenVpnServersGetAllWithStatusQueryKey } from "../api/orval/vpn-servers-v3/vpn-servers-v3";
import {
  getGetApiOpenVpnServersGetVpnServerIdQueryKey,
  getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey,
} from "../api/orval/vpn-servers/vpn-servers";
import type { ApiEnvelope } from "./TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import { errorMessage } from "../utils/errorMessage";
import { VpnServerType, vpnServerTypeLabel } from "../constants/vpnServerType";

type GetByIdResult = Awaited<ReturnType<typeof getApiOpenVpnServersGetVpnServerId>>;

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function unwrapServerDto(raw: GetByIdResult | undefined): VpnServerDto | null {
  if (!raw) return null;

  const top = asRecord(raw);
  if (!top) return null;
  const data = asRecord(top["data"]);
  const s =
    (top["vpnServer"] as unknown) ??
    data?.["vpnServer"] ??
    raw;

  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;

  const rawServerType =
    typeof o["serverType"] === "number"
      ? o["serverType"]
      : o["serverType"] != null
        ? Number(o["serverType"])
        : VpnServerType.OpenVpn;
  const serverType: OrvalVpnServerType =
    rawServerType === VpnServerType.Xray ? (VpnServerType.Xray as OrvalVpnServerType) : (VpnServerType.OpenVpn as OrvalVpnServerType);

  const dto: VpnServerDto = {
    id: typeof o["id"] === "number" ? o["id"] : o["id"] != null ? Number(o["id"]) : undefined,
    serverType,
    serverName: (o["serverName"] as string | null | undefined) ?? null,
    isOnline: Boolean(o["isOnline"] ?? false),
    isDisabled: Boolean(o["isDisabled"] ?? false),
    isDefault: Boolean(o["isDefault"] ?? false),
    apiUrl: (o["apiUrl"] as string | null | undefined) ?? null,
    latitude: (o["latitude"] as number | null | undefined) ?? null,
    longitude: (o["longitude"] as number | null | undefined) ?? null,
    isEnableWss: Boolean(o["isEnableWss"] ?? false),
    isPiHoleEnabled: Boolean(o["isPiHoleEnabled"] ?? false),
    createDate: o["createDate"] as string | undefined,
    lastUpdate: o["lastUpdate"] as string | undefined,
    tags: Array.isArray(o["tags"]) ? o["tags"] : (o["tags"] as string[] | null | undefined) ?? null,
  };

  return dto;
}

function getAllowedItemsByVpnServer(raw: unknown): QuotaPlanAllowedServerDto[] {
  if (raw == null) return [];
  const r = raw as Record<string, unknown>;
  if (Array.isArray(r.items)) return r.items as QuotaPlanAllowedServerDto[];
  const data = r.data as Record<string, unknown> | undefined;
  if (data && Array.isArray(data.items)) return data.items as QuotaPlanAllowedServerDto[];
  const unwrapped = unwrapMaybeApiResponse<{ items?: QuotaPlanAllowedServerDto[] | null }>(
    raw as
      | { items?: QuotaPlanAllowedServerDto[] | null }
      | ApiEnvelope<{ items?: QuotaPlanAllowedServerDto[] | null }>
      | undefined,
  );
  return unwrapped?.items ?? [];
}

function unwrapNewServerIdFromAdd(raw: unknown): number | null {
  const top = unwrapMaybeApiResponse<VpnServerResponse>(
    raw as VpnServerResponse | ApiEnvelope<VpnServerResponse> | undefined,
  );
  const rawRec = asRecord(raw);
  const nested = rawRec ? asRecord(rawRec["data"]) : null;
  const fromRaw =
    (rawRec?.["vpnServer"] as { id?: number } | undefined)?.id ??
    (nested?.["vpnServer"] as { id?: number } | undefined)?.id;
  const id = top?.vpnServer?.id ?? fromRaw;
  return typeof id === "number" && id > 0 ? id : null;
}

function unwrapPostSetupStatus(raw: unknown): VpnServersResponsesVpnServerPostSetupStatusResponse | null {
  return (
    unwrapMaybeApiResponse<VpnServersResponsesVpnServerPostSetupStatusResponse>(
      raw as
        | VpnServersResponsesVpnServerPostSetupStatusResponse
        | ApiEnvelope<VpnServersResponsesVpnServerPostSetupStatusResponse>
        | undefined,
    ) ?? null
  );
}

const POST_SETUP_MAX_POLLS = 60;
const POST_SETUP_POLL_DELAY_MS = 1000;

type PostSetupUiPhase = "idle" | "polling" | "succeeded" | "failed" | "timeout";

type PostSetupUi = {
  phase: PostSetupUiPhase;
  status: VpnServersResponsesVpnServerPostSetupStatusResponse | null;
};

function postSetupStateLabel(
  state: VpnServersResponsesVpnServerPostSetupState | undefined,
): string {
  switch (state) {
    case VpnServersResponsesVpnServerPostSetupState.NUMBER_0:
      return "Queued";
    case VpnServersResponsesVpnServerPostSetupState.NUMBER_1:
      return "Running";
    case VpnServersResponsesVpnServerPostSetupState.NUMBER_2:
      return "Completed";
    case VpnServersResponsesVpnServerPostSetupState.NUMBER_3:
      return "Failed";
    default:
      return "Unknown";
  }
}

function postSetupStepLabel(step: string | null | undefined): string {
  switch (step) {
    case "queued":
      return "Waiting to start";
    case "running":
      return "Resolving IP and default export config";
    case "completed":
      return "Finished";
    case "failed":
      return "Setup failed";
    default:
      return step?.trim() ? step : "Post-create setup";
  }
}

async function pollPostSetupUntilFinished(
  vpnServerId: number,
  operationId: string,
  onUpdate?: (status: VpnServersResponsesVpnServerPostSetupStatusResponse) => void,
): Promise<VpnServersResponsesVpnServerPostSetupStatusResponse | null> {
  let lastStatus: VpnServersResponsesVpnServerPostSetupStatusResponse | null = null;

  for (let attempt = 0; attempt < POST_SETUP_MAX_POLLS; attempt += 1) {
    const statusRaw = await getApiOpenVpnServersPostSetupVpnServerIdStatus(vpnServerId, { operationId });
    const status = unwrapPostSetupStatus(statusRaw);
    if (status) {
      lastStatus = status;
      onUpdate?.(status);
    }
    const state = status?.state;
    if (
      state === VpnServersResponsesVpnServerPostSetupState.NUMBER_2 ||
      state === VpnServersResponsesVpnServerPostSetupState.NUMBER_3
    ) {
      return status;
    }
    await new Promise((resolve) => {
      window.setTimeout(resolve, POST_SETUP_POLL_DELAY_MS);
    });
  }

  return lastStatus;
}

function PostSetupProgressPanel({ ui }: { ui: PostSetupUi }) {
  if (ui.phase === "idle") return null;

  const state = ui.status?.state;
  const isActive =
    ui.phase === "polling" ||
    state === VpnServersResponsesVpnServerPostSetupState.NUMBER_0 ||
    state === VpnServersResponsesVpnServerPostSetupState.NUMBER_1;
  const isSuccess =
    ui.phase === "succeeded" || state === VpnServersResponsesVpnServerPostSetupState.NUMBER_2;
  const isFailed =
    ui.phase === "failed" || state === VpnServersResponsesVpnServerPostSetupState.NUMBER_3;
  const isTimeout = ui.phase === "timeout";

  const panelClass = [
    "post-setup-panel",
    isActive ? "post-setup-panel--active" : "",
    isSuccess ? "post-setup-panel--success" : "",
    isFailed ? "post-setup-panel--failed" : "",
    isTimeout ? "post-setup-panel--timeout" : "",
  ]
    .filter(Boolean)
    .join(" ");

  const details = ui.status?.details;
  const detailEntries =
    details && typeof details === "object"
      ? Object.entries(details as Record<string, string>).filter(([, v]) => v != null && String(v).trim())
      : [];

  return (
    <div
      className={panelClass}
      role="status"
      aria-live="polite"
      aria-busy={isActive}
    >
      <div className="post-setup-panel-title">Post-create setup</div>
      <ul className="post-setup-steps">
        <li className="post-setup-step post-setup-step--done">
          <span className="post-setup-step-icon" aria-hidden>
            ✓
          </span>
          <span>Server saved to database</span>
        </li>
        <li
          className={[
            "post-setup-step",
            isSuccess ? "post-setup-step--done" : "",
            isFailed ? "post-setup-step--failed" : "",
            isActive ? "post-setup-step--active" : "",
            isTimeout ? "post-setup-step--timeout" : "",
          ]
            .filter(Boolean)
            .join(" ")}
        >
          <span className="post-setup-step-icon" aria-hidden>
            {isFailed ? "!" : isSuccess ? "✓" : "…"}
          </span>
          <span>{postSetupStepLabel(ui.status?.currentStep)}</span>
        </li>
      </ul>

      <div className="post-setup-status-line">
        <strong>Status:</strong> {postSetupStateLabel(state)}
        {ui.status?.message ? (
          <>
            {" "}
            — <span className="post-setup-message">{ui.status.message}</span>
          </>
        ) : null}
      </div>

      {isActive && (
        <div className="post-setup-progress-track" aria-hidden>
          <div className="post-setup-progress-bar post-setup-progress-bar--indeterminate" />
        </div>
      )}

      {isTimeout && (
        <p className="post-setup-hint">
          Setup is taking longer than expected. The server was created; you can finish configuration on the edit page.
        </p>
      )}

      {detailEntries.length > 0 && (
        <dl className="post-setup-details">
          {detailEntries.map(([key, value]) => (
            <div key={key} className="post-setup-detail-row">
              <dt>{key}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </div>
  );
}

async function syncQuotaPlanAssignments(
  vpnServerId: number,
  previous: QuotaPlanAllowedServerDto[],
  selectedPlanIds: number[],
) {
  const prevByPlanId = new Map<number, QuotaPlanAllowedServerDto>();
  for (const link of previous) {
    if (link.quotaPlanId != null) prevByPlanId.set(link.quotaPlanId, link);
  }
  const selected = new Set(selectedPlanIds);

  for (const planId of selected) {
    if (!prevByPlanId.has(planId)) {
      await postApiQuotaPlanAllowedServersCreate({ quotaPlanId: planId, vpnServerId });
    }
  }

  for (const [planId, link] of prevByPlanId) {
    if (!selected.has(planId) && link.id != null) {
      await deleteApiQuotaPlanAllowedServersDeleteId(link.id);
    }
  }
}

function unwrapMicroserviceDiagnosticsPayload(raw: unknown): Record<string, unknown> | null {
  const top = asRecord(raw);
  if (!top) return null;
  const envData = asRecord(top["data"]);
  const diagnostics = envData ?? top;
  if (diagnostics && (diagnostics["openVpn"] != null || diagnostics["xray"] != null)) {
    const st = diagnostics["serverType"];
    const openVpn = asRecord(diagnostics["openVpn"]);
    const xray = asRecord(diagnostics["xray"]);
    if (st === 1 && xray) return xray;
    if (openVpn) return openVpn;
    if (xray) return xray;
  }
  return top;
}

function ApiCheckSuccessSummary({ data }: { data: unknown }) {
  const wire = unwrapMicroserviceDiagnosticsPayload(data);
  const rec = wire;
  const cfg =
    rec && typeof rec["config"] === "object" && rec["config"] !== null
      ? asRecord(rec["config"])
      : null;
  const version = rec?.["version"];
  const application = rec?.["application"];
  return (
    <div className="api-check-result api-check-success">
      <div className="api-check-summary">
        {typeof version === "string" && (
          <span>
            <strong>Version:</strong> {version}
          </span>
        )}
        {typeof application === "string" && (
          <span>
            <strong>Application:</strong> {application}
          </span>
        )}
        {cfg != null && (
          <>
            {cfg["port"] != null && (
              <span>
                <strong>Port:</strong> {String(cfg["port"])}
              </span>
            )}
            {cfg["proto"] != null && (
              <span>
                <strong>Proto:</strong> {String(cfg["proto"])}
              </span>
            )}
          </>
        )}
      </div>
      <pre className="api-check-json">{JSON.stringify(data, null, 2)}</pre>
    </div>
  );
}

function toNumberOrNull(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const ServerForm: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { serverId } = useParams<{ serverId?: string }>();
  const idNum = Number(serverId || 0);
  const highlightPreRef = React.useRef<HTMLPreElement | null>(null);
  const configTextareaRef = React.useRef<HTMLTextAreaElement | null>(null);

  const { data: serverResp, isFetching } = useGetApiOpenVpnServersGetVpnServerId(idNum, {
    query: { enabled: !!idNum },
  });

  const { data: tagsResp } = useGetApiTagsGetAll();

  const getPlansMutation = usePostApiQuotaPlansGetAll();
  const [quotaPlans, setQuotaPlans] = React.useState<QuotaPlanDto[]>([]);
  const [selectedQuotaPlanIds, setSelectedQuotaPlanIds] = React.useState<number[]>([]);
  const [quotaPlansHydrated, setQuotaPlansHydrated] = React.useState(false);

  const { data: allowedByServerRaw, isFetched: allowedPlansFetched } =
    useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId(idNum, {
      query: { enabled: idNum > 0 },
    });

  const allTags = React.useMemo(() => {
    const raw = tagsResp as { tags?: { id?: number; name?: string | null }[]; data?: { tags?: { id?: number; name?: string | null }[] } } | undefined;
    return raw?.tags ?? raw?.data?.tags ?? [];
  }, [tagsResp]);

  const addMutation = usePostApiOpenVpnServersAdd();
  const updateMutation = usePutApiOpenVpnServersUpdate();
  const saveOvpnConfigMutation = usePostApiOpenVpnConfigsAddUpdate();

  const [serverData, setServerData] = React.useState<VpnServerDto>({
    id: idNum || undefined,
    serverType: VpnServerType.OpenVpn,
    serverName: "",
    isOnline: false,
    isDisabled: false,
    isDefault: false,
    apiUrl: null,
    latitude: null,
    longitude: null,
    isEnableWss: false,
    isPiHoleEnabled: false,
    createDate: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  });

  const isOpenVpnForQueries = (serverData.serverType ?? VpnServerType.OpenVpn) === VpnServerType.OpenVpn;

  const { data: ovpnConfigData } = useGetApiOpenVpnConfigsGetVpnServerId(idNum, {
    query: { enabled: idNum > 0 && isOpenVpnForQueries },
  });

  const [selectedTagIds, setSelectedTagIds] = React.useState<number[]>([]);
  const [newTagName, setNewTagName] = React.useState("");
  const [postSetupUi, setPostSetupUi] = React.useState<PostSetupUi>({ phase: "idle", status: null });
  const postSetupBusy = postSetupUi.phase === "polling";
  const createTagMutation = usePostApiTagsCreate({
    mutation: {
      onSuccess: (resp) => {
        queryClient.invalidateQueries({ queryKey: getGetApiTagsGetAllQueryKey() });
        const createdId = (resp as { tag?: { id?: number } })?.tag?.id;
        if (typeof createdId === "number") {
          setSelectedTagIds((prev) => (prev.includes(createdId) ? prev : [...prev, createdId]));
        }
        setNewTagName("");
        toast.success("Tag created");
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to create tag";
        toast.error(msg);
      },
    },
  });

  const deleteTagMutation = useDeleteApiTagsDeleteId({
    mutation: {
      onSuccess: (_, variables) => {
        queryClient.invalidateQueries({ queryKey: getGetApiTagsGetAllQueryKey() });
        setSelectedTagIds((prev) => prev.filter((id) => id !== variables.id));
        toast.success("Tag deleted");
      },
      onError: (err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to delete tag";
        toast.error(msg);
      },
    },
  });

  const [ovpnConfig, setOvpnConfig] = React.useState({
    vpnServerIp: "",
    vpnServerPort: 1194,
    configTemplate: OPEN_VPN_EXPORT_TEMPLATE,
  });

  const [copyStatus, setCopyStatus] = React.useState<"Copy" | "Copied!">("Copy");
  const [appliedAllowedPlansKey, setAppliedAllowedPlansKey] = React.useState("");

  const [quotaScopeId, setQuotaScopeId] = React.useState(idNum);
  if (quotaScopeId !== idNum) {
    setQuotaScopeId(idNum);
    setAppliedAllowedPlansKey("");
    setQuotaPlansHydrated(!idNum);
    if (!idNum) setSelectedQuotaPlanIds([]);
  }

  React.useEffect(() => {
    getPlansMutation.mutate(
      { data: { includeInactive: true } },
      {
        onSuccess: (raw) => {
          const payload = unwrapMaybeApiResponse<QuotaPlansResponse>(
            raw as QuotaPlansResponse | ApiEnvelope<QuotaPlansResponse> | undefined,
          );
          setQuotaPlans(payload?.quotaPlans ?? []);
        },
      }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mutation result reference is unstable; `mutate` is stable (TanStack Query v5)
  }, [getPlansMutation.mutate]);

  const allowedPlansKey = React.useMemo(
    () => (allowedByServerRaw ? JSON.stringify(allowedByServerRaw) : `empty:${allowedPlansFetched}`),
    [allowedByServerRaw, allowedPlansFetched],
  );
  if (idNum && allowedPlansKey !== appliedAllowedPlansKey) {
    setAppliedAllowedPlansKey(allowedPlansKey);
    if (allowedByServerRaw) {
      const items = getAllowedItemsByVpnServer(allowedByServerRaw);
      setSelectedQuotaPlanIds(
        items
          .map((i) => i.quotaPlanId)
          .filter((x): x is number => typeof x === "number"),
      );
      setQuotaPlansHydrated(true);
    } else if (allowedPlansFetched) {
      setSelectedQuotaPlanIds([]);
      setQuotaPlansHydrated(true);
    }
  }

  const visibleQuotaPlans = React.useMemo(() => {
    return quotaPlans
      .filter((p) => p.id != null)
      .sort((a, b) => String(a.name ?? "").localeCompare(String(b.name ?? "")));
  }, [quotaPlans]);

  const [errors, setErrors] = React.useState<{
    serverName: string;
    vpnServerIp: string;
    vpnServerPort: string;
  }>({
    serverName: "",
    vpnServerIp: "",
    vpnServerPort: "",
  });

  type ApiCheckStatus = "idle" | "loading" | "success" | "error";
  const [apiCheck, setApiCheck] = React.useState<{
    status: ApiCheckStatus;
    data?: unknown;
    error?: string;
  }>({ status: "idle" });

  const [appliedServerResp, setAppliedServerResp] = React.useState<unknown>(null);
  if (serverResp && serverResp !== appliedServerResp) {
    setAppliedServerResp(serverResp);
    const dto = unwrapServerDto(serverResp);
    if (dto) {
      setServerData((prev) => ({
        ...prev,
        ...dto,
        id: dto.id ?? prev.id ?? (idNum || undefined),
        serverType: dto.serverType ?? VpnServerType.OpenVpn,
        serverName: dto.serverName ?? "",
        apiUrl: dto.apiUrl ?? null,
        latitude: dto.latitude ?? null,
        longitude: dto.longitude ?? null,
        isOnline: dto.isOnline ?? false,
        isDisabled: dto.isDisabled ?? false,
        isDefault: dto.isDefault ?? false,
        isEnableWss: dto.isEnableWss ?? false,
        isPiHoleEnabled: dto.isPiHoleEnabled ?? false,
        lastUpdate: dto.lastUpdate ?? prev.lastUpdate,
        createDate: dto.createDate ?? prev.createDate,
      }));

      const tagNames = dto.tags ?? [];
      const ids =
        tagNames.length > 0 && allTags.length > 0
          ? allTags
              .filter((t) => t.name != null && tagNames.includes(t.name))
              .map((t) => t.id!)
              .filter((tagId): tagId is number => typeof tagId === "number")
          : [];
      setSelectedTagIds(ids);
    }
  }

  const loadedOvpnConfig = React.useMemo(
    () => unwrapOvpnFileConfigPayload(ovpnConfigData),
    [ovpnConfigData],
  );

  React.useEffect(() => {
    if (!loadedOvpnConfig) return;
    const templateFromApi = (loadedOvpnConfig.configTemplate ?? "").trim();
    setOvpnConfig({
      vpnServerIp: (loadedOvpnConfig.vpnServerIp ?? "").trim(),
      vpnServerPort: Number(loadedOvpnConfig.vpnServerPort ?? 1194) || 1194,
      configTemplate: templateFromApi || OPEN_VPN_EXPORT_TEMPLATE,
    });
  }, [loadedOvpnConfig]);

  const validateForm = () => {
    let ok = true;
    const next = { serverName: "", vpnServerIp: "", vpnServerPort: "" };

    if (!String(serverData.serverName ?? "").trim()) {
      next.serverName = "Server name is required.";
      ok = false;
    }

    const isOpenVpnServer = (serverData.serverType ?? VpnServerType.OpenVpn) === VpnServerType.OpenVpn;
    if (idNum > 0 && isOpenVpnServer) {
      if (!String(ovpnConfig.vpnServerIp ?? "").trim()) {
        next.vpnServerIp = "VPN Server IP is required.";
        ok = false;
      }
      if (
        !ovpnConfig.vpnServerPort ||
        ovpnConfig.vpnServerPort < 1 ||
        ovpnConfig.vpnServerPort > 65535
      ) {
        next.vpnServerPort = "VPN Server Port must be between 1 and 65535.";
        ok = false;
      }
    }

    setErrors(next);
    return ok;
  };

  const handleTextChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    if (name === "serverName") {
      setServerData((p) => ({ ...p, serverName: value }));
      return;
    }

    if (name === "serverType") {
      const nextType: OrvalVpnServerType =
        Number(value) === VpnServerType.Xray ? (VpnServerType.Xray as OrvalVpnServerType) : (VpnServerType.OpenVpn as OrvalVpnServerType);
      setServerData((p) => ({
        ...p,
        serverType: nextType,
        apiUrl:
          nextType === VpnServerType.Xray && !String(p.apiUrl ?? "").trim()
            ? "http://xray:5010/"
            : p.apiUrl,
      }));
      return;
    }

    if (name === "apiUrl") {
      setServerData((p) => ({ ...p, apiUrl: value.trim() ? value : null }));
      setApiCheck((prev) => (prev.status !== "idle" ? { status: "idle" } : prev));
      return;
    }

    if (name === "latitude") {
      setServerData((p) => ({ ...p, latitude: toNumberOrNull(value) }));
      return;
    }

    if (name === "longitude") {
      setServerData((p) => ({ ...p, longitude: toNumberOrNull(value) }));
      return;
    }

    if (name === "vpnServerIp") {
      setOvpnConfig((p) => ({ ...p, vpnServerIp: value }));
      return;
    }

    if (name === "vpnServerPort") {
      setOvpnConfig((p) => ({ ...p, vpnServerPort: Number(value) || 0 }));
      return;
    }

    if (name === "configTemplate") {
      setOvpnConfig((p) => ({ ...p, configTemplate: value }));
      return;
    }
  };

  const handleCopyConfig = async () => {
    try {
      await navigator.clipboard.writeText(ovpnConfig.configTemplate);
      setCopyStatus("Copied!");
      setTimeout(() => setCopyStatus("Copy"), 2000);
    } catch {
      toast.error("Failed to copy text");
      setCopyStatus("Copy");
    }
  };

  const handleCheckApiUrl = React.useCallback(async () => {
    const url = String(serverData.apiUrl ?? "").trim();
    if (!url) {
      toast.error("Enter API URL first");
      return;
    }
    let targetUrl = url;
    try {
      new URL(targetUrl);
    } catch {
      toast.error("Invalid URL");
      return;
    }
    if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
      targetUrl = "https://" + targetUrl;
    }
    setApiCheck({ status: "loading" });
    try {
      // Backend accepts optional query `serverType`; pinned OpenAPI may lag until `npm run gen:api` from live Swagger.
      const params = {
        baseUrl: targetUrl,
        serverType: (serverData.serverType ?? VpnServerType.OpenVpn) as OrvalVpnServerType,
      } as GetApiOpenVpnServersGetMicroserviceInfoByUrlParams;
      const data = await getApiOpenVpnServersGetMicroserviceInfoByUrl(params);
      setApiCheck({ status: "success", data });
      toast.success("Server responded successfully");
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : typeof err === "object" && err != null && "message" in err
            ? String((err as { message: unknown }).message)
            : "Request failed";
      setApiCheck({ status: "error", error: msg });
      toast.error("Check failed: " + msg);
    }
  }, [serverData.apiUrl, serverData.serverType]);

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;

    if (name === "isDefault") {
      setServerData((p) => ({ ...p, isDefault: checked }));
      return;
    }

    if (name === "isOnline") {
      setServerData((p) => ({ ...p, isOnline: checked }));
      return;
    }

    if (name === "isDisabled") {
      setServerData((p) => ({ ...p, isDisabled: checked }));
      return;
    }

    if (name === "isEnableWss") {
      setServerData((p) => ({ ...p, isEnableWss: checked }));
      return;
    }
    if (name === "isPiHoleEnabled") {
      setServerData((p) => ({ ...p, isPiHoleEnabled: checked }));
      return;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    const invalidateQuotaCaches = (vpnServerId: number) => {
      queryClient.invalidateQueries({
        queryKey: getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey(vpnServerId),
      });
      queryClient.invalidateQueries({ queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined) });
      queryClient.invalidateQueries({ queryKey: getGetApiOpenVpnServersGetVpnServerIdQueryKey(vpnServerId) });
      queryClient.invalidateQueries({
        queryKey: getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey(vpnServerId),
      });
    };

    try {
      if (idNum) {
        const isOpenVpnServer = (serverData.serverType ?? VpnServerType.OpenVpn) === VpnServerType.OpenVpn;
        const payload: UpdateServerRequest = {
          id: Number(serverData.id ?? idNum),
          serverType: serverData.serverType ?? VpnServerType.OpenVpn,
          serverName: String(serverData.serverName ?? "").trim(),
          apiUrl: serverData.apiUrl ?? null,
          isDefault: serverData.isDefault ?? false,
          isOnline: serverData.isOnline ?? false,
          isDisabled: serverData.isDisabled ?? false,
          latitude: serverData.latitude ?? null,
          longitude: serverData.longitude ?? null,
          isEnableWss: serverData.isEnableWss ?? false,
          isPiHoleEnabled: serverData.isPiHoleEnabled ?? false,
          tagIds: selectedTagIds,
          quotaPlanIds: selectedQuotaPlanIds,
        };

        await updateMutation.mutateAsync({ data: payload });

        if (isOpenVpnServer) {
          await saveOvpnConfigMutation.mutateAsync({
            data: {
              vpnServerId: idNum,
              vpnServerIp: String(ovpnConfig.vpnServerIp ?? "").trim(),
              vpnServerPort: ovpnConfig.vpnServerPort || 1194,
              configTemplate: ovpnConfig.configTemplate || null,
            },
          });
        }

        invalidateQuotaCaches(idNum);
        toast.success(
          isOpenVpnServer ? "Server and OpenVPN config updated successfully!" : "Server updated successfully!",
        );
        navigate("/");
      } else {
        const payload: AddServerRequest = {
          serverType: serverData.serverType ?? VpnServerType.OpenVpn,
          serverName: String(serverData.serverName ?? "").trim(),
          apiUrl: serverData.apiUrl ?? null,
          isDefault: serverData.isDefault ?? false,
          isOnline: serverData.isOnline ?? false,
          isDisabled: serverData.isDisabled ?? false,
          latitude: serverData.latitude ?? null,
          longitude: serverData.longitude ?? null,
          isEnableWss: serverData.isEnableWss ?? false,
          isPiHoleEnabled: serverData.isPiHoleEnabled ?? false,
          quotaPlanIds: selectedQuotaPlanIds,
          tagIds: selectedTagIds,
        };

        const addResult = await addMutation.mutateAsync({ data: payload });
        const newId = unwrapNewServerIdFromAdd(addResult);

        let navigateTo: string | null = "/";

        if (newId) {
          setPostSetupUi({
            phase: "polling",
            status: {
              vpnServerId: newId,
              state: VpnServersResponsesVpnServerPostSetupState.NUMBER_0,
              message: "Server saved. Starting post-create setup…",
              currentStep: "queued",
            },
          });
          await new Promise<void>((resolve) => {
            window.setTimeout(resolve, 0);
          });

          try {
            const setupStart = await postApiOpenVpnServersPostSetupVpnServerIdStart(newId);
            const setupStatus = unwrapPostSetupStatus(setupStart);
            if (setupStatus) {
              setPostSetupUi({ phase: "polling", status: setupStatus });
            }
            const operationId = setupStatus?.operationId ?? "";
            if (operationId) {
              const finalStatus = await pollPostSetupUntilFinished(newId, operationId, (status) => {
                setPostSetupUi({ phase: "polling", status });
              });
              const finalState = finalStatus?.state;
              if (finalState === VpnServersResponsesVpnServerPostSetupState.NUMBER_3) {
                setPostSetupUi({ phase: "failed", status: finalStatus });
                toast.error(finalStatus?.message ?? "Post-create setup failed");
                navigateTo = `/servers/edit/${newId}`;
              } else if (finalState === VpnServersResponsesVpnServerPostSetupState.NUMBER_2) {
                setPostSetupUi({ phase: "succeeded", status: finalStatus });
                toast.success(finalStatus?.message ?? "Server added and configured successfully.");
                await new Promise<void>((resolve) => {
                  window.setTimeout(resolve, 800);
                });
              } else {
                setPostSetupUi({ phase: "timeout", status: finalStatus });
                toast.warning("Server was added, but post-create setup is still running.");
                navigateTo = `/servers/edit/${newId}`;
              }
            } else {
              setPostSetupUi({ phase: "failed", status: setupStatus });
              toast.warning("Server added, but setup could not be tracked.");
              navigateTo = `/servers/edit/${newId}`;
            }
          } catch (setupErr: unknown) {
            const message = setupErr instanceof Error ? setupErr.message : "Failed to start post-create setup";
            setPostSetupUi({
              phase: "failed",
              status: {
                vpnServerId: newId,
                state: VpnServersResponsesVpnServerPostSetupState.NUMBER_3,
                message,
                currentStep: "failed",
              },
            });
            toast.warning(`Server added, but setup start failed: ${message}`);
            navigateTo = `/servers/edit/${newId}`;
          }

          if (selectedQuotaPlanIds.length > 0) {
            try {
              await syncQuotaPlanAssignments(newId, [], selectedQuotaPlanIds);
            } catch (quotaErr: unknown) {
              const msg =
                quotaErr instanceof Error
                  ? quotaErr.message
                  : typeof quotaErr === "object" && quotaErr != null && "message" in quotaErr
                    ? String((quotaErr as { message: unknown }).message)
                    : "Quota plan links failed";
              toast.error(`Server added, but quota plans: ${msg}`);
            }
          }
          invalidateQuotaCaches(newId);
        } else {
          queryClient.invalidateQueries({
            queryKey: getGetApiV3OpenVpnServersGetAllWithStatusQueryKey(undefined),
          });
          toast.success("Server added successfully!");
        }

        if (navigateTo) {
          navigate(navigateTo);
        }
      }
    } catch (err: unknown) {
      const base = idNum ? "Failed to update server." : "Failed to add server.";
      toast.error(errorMessage(err) || base);
    }
  };

  return (
      <div className="content-wrapper wide-table">
        <div className="server-form-container">
          <h2 className="server-form-header">{idNum ? "Edit Server" : "Add New Server"}</h2>

          <form className="server-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="ServerName">Server Name *</label>
              <input
                  type="text"
                  id="ServerName"
                  name="serverName"
                  value={String(serverData.serverName ?? "")}
                  onChange={handleTextChange}
                  className={errors.serverName ? "input-error" : ""}
                  placeholder="Enter server name"
                  disabled={isFetching}
              />
              {errors.serverName && <p className="error-message">{errors.serverName}</p>}
            </div>

            <div className="form-group">
              {idNum ? (
                <span className="form-group-label">VPN stack</span>
              ) : (
                <label htmlFor="ServerType">VPN stack</label>
              )}
              {idNum ? (
                <p className="form-hint form-hint--mt-4" id="ServerType">
                  {vpnServerTypeLabel(serverData.serverType)} (type cannot be changed after create)
                </p>
              ) : (
                <select
                  id="ServerType"
                  name="serverType"
                  value={String(serverData.serverType ?? VpnServerType.OpenVpn)}
                  onChange={handleTextChange}
                  disabled={isFetching}
                >
                  <option value={String(VpnServerType.OpenVpn)}>OpenVPN</option>
                  <option value={String(VpnServerType.Xray)}>Xray (VLESS)</option>
                </select>
              )}
              {!idNum && (
                <p className="form-hint form-hint--mt-6">
                  Xray uses the DataGateXRayManager sidecar; default API URL for Docker Compose is{" "}
                  <code>http://xray:5010/</code>.
                </p>
              )}
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isDefault"
                    checked={Boolean(serverData.isDefault)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Default Server</span>
                  <span className="checkbox-description">
                  Mark this server as the default entry point for clients.
                </span>
                </div>
              </label>
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isOnline"
                    checked={Boolean(serverData.isOnline)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Online</span>
                  <span className="checkbox-description">Show this server as online.</span>
                </div>
              </label>
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isDisabled"
                    checked={Boolean(serverData.isDisabled)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Disable background polling</span>
                  <span className="checkbox-description">
                    When enabled, the dashboard background service must not poll this server (OpenVPN/Xray
                    metrics). Requires API support for <code>isDisabled</code>.
                  </span>
                </div>
              </label>
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isPiHoleEnabled"
                    checked={Boolean(serverData.isPiHoleEnabled)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching || (serverData.serverType ?? VpnServerType.OpenVpn) !== VpnServerType.OpenVpn}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Enable Pi-hole integration</span>
                  <span className="checkbox-description">
                    Start DNS query collection on this server (configure connection on the Pi-hole tab first).
                  </span>
                </div>
              </label>
            </div>

            <div className="form-group checkbox-container">
              <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="isEnableWss"
                    checked={Boolean(serverData.isEnableWss)}
                    onChange={handleCheckboxChange}
                    disabled={isFetching}
                />
                <div className="checkbox-content">
                  <span className="checkbox-title">Enable WSS</span>
                  <span className="checkbox-description">Allow WSS transport for this server.</span>
                </div>
              </label>
            </div>

            <div className="form-group">
              <label htmlFor="ApiUrl">API url</label>
              <div className="api-url-row">
                <input
                  type="text"
                  id="ApiUrl"
                  name="apiUrl"
                  value={serverData.apiUrl ?? ""}
                  onChange={handleTextChange}
                  placeholder={
                    (serverData.serverType ?? VpnServerType.OpenVpn) === VpnServerType.Xray
                      ? "e.g. http://xray:5010/"
                      : "e.g. http://openvpn_udp:5010/"
                  }
                  disabled={isFetching}
                />
                <button
                  type="button"
                  className="btn secondary api-check-btn"
                  onClick={handleCheckApiUrl}
                  disabled={isFetching || !String(serverData.apiUrl ?? "").trim() || apiCheck.status === "loading"}
                  title="Send GET request to the URL and show microservice response"
                >
                  {apiCheck.status === "loading" ? (
                    <span className="api-check-spinner" aria-hidden />
                  ) : (
                    FaCheckCircle({ className: "icon" })
                  )}{" "}
                  {apiCheck.status === "loading" ? "Checking…" : "Check server"}
                </button>
              </div>
              {apiCheck.status === "success" && apiCheck.data != null && (
                <ApiCheckSuccessSummary data={apiCheck.data} />
              )}
              {apiCheck.status === "error" && apiCheck.error && (
                <div className="api-check-result api-check-error">
                  <strong>Error:</strong> {apiCheck.error}
                </div>
              )}
            </div>

            <div className="form-group">
              <label htmlFor="Latitude">Latitude</label>
              <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  id="Latitude"
                  name="latitude"
                  value={serverData.latitude ?? ""}
                  onChange={handleTextChange}
                  placeholder="Enter latitude (optional)"
                  disabled={isFetching}
              />
            </div>

            <div className="form-group">
              <label htmlFor="Longitude">Longitude</label>
              <input
                  type="number"
                  inputMode="decimal"
                  step="any"
                  id="Longitude"
                  name="longitude"
                  value={serverData.longitude ?? ""}
                  onChange={handleTextChange}
                  placeholder="Enter longitude (optional)"
                  disabled={isFetching}
              />
            </div>

            <div className="form-group">
              <label>Tags</label>
              <p className="form-hint tags-section-hint">
                Create a new tag below or select existing tags for this server.
              </p>
              <div className="tags-create-row">
                <input
                  id="server-new-tag-name"
                  name="serverNewTagName"
                  type="text"
                  value={newTagName}
                  onChange={(e) => setNewTagName(e.target.value)}
                  placeholder="New tag name"
                  className="tags-new-input"
                  maxLength={64}
                  disabled={isFetching || createTagMutation.isPending}
                />
                <button
                  type="button"
                  className="btn secondary"
                  disabled={
                    !newTagName.trim() || isFetching || createTagMutation.isPending
                  }
                  onClick={() => {
                    const name = newTagName.trim();
                    if (!name) return;
                    createTagMutation.mutate({ data: { name } });
                  }}
                >
                  Create tag
                </button>
              </div>
              <span className="tags-select-label">Please select tags:</span>
              <div className="tags-checkbox-list">
                {allTags.length === 0 ? (
                  <span className="form-hint">
                    {idNum > 0
                      ? "No tags yet. Create one above and assign to this server."
                      : "No tags yet. Create one above; selected tags will be assigned when you save the server."}
                  </span>
                ) : (
                  allTags.map((tag) => (
                    <div key={tag.id ?? tag.name} className="tags-checkbox-item tags-checkbox-row">
                      <label className="checkbox-label tags-checkbox-item-inner">
                        <input
                          id={`server-tag-${tag.id ?? tag.name}`}
                          name={`serverTag${tag.id ?? tag.name}`}
                          type="checkbox"
                          checked={selectedTagIds.includes(tag.id!)}
                          onChange={() => {
                            setSelectedTagIds((prev) =>
                              prev.includes(tag.id!)
                                ? prev.filter((id) => id !== tag.id)
                                : [...prev, tag.id!]
                            );
                          }}
                          disabled={isFetching}
                        />
                        <span className="checkbox-content">{tag.name ?? ""}</span>
                      </label>
                      <button
                        type="button"
                        className="btn secondary btn-icon-small"
                        title="Delete tag"
                        disabled={isFetching || deleteTagMutation.isPending}
                        onClick={() => {
                          if (tag.id == null) return;
                          if (!window.confirm(`Delete tag "${tag.name ?? ""}"? It will be removed from all servers.`)) return;
                          deleteTagMutation.mutate({ id: tag.id });
                        }}
                      >
                        <FaTrash className="icon" />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="form-group">
              <label>Quota plans</label>
              <p className="form-hint tags-section-hint">
                Select which quota plans may use this server. You can change this later when editing the server.
              </p>
              <div className="tags-checkbox-list">
                {idNum > 0 && !quotaPlansHydrated ? (
                  <p className="quota-plans-loading">Loading assigned quota plans…</p>
                ) : visibleQuotaPlans.length === 0 ? (
                  <span className="form-hint">
                    {getPlansMutation.isPending ? "Loading quota plans…" : "No quota plans defined. Create them under Settings → Quota plans."}
                  </span>
                ) : (
                  visibleQuotaPlans.map((plan) => {
                    const pid = plan.id!;
                    const label =
                      (plan.name?.trim() || `Plan #${pid}`) +
                      (plan.isActive === false ? " (inactive)" : "");
                    return (
                      <div key={pid} className="tags-checkbox-item tags-checkbox-row">
                        <label className="checkbox-label tags-checkbox-item-inner">
                          <input
                            id={`server-quota-plan-${pid}`}
                            name={`serverQuotaPlan${pid}`}
                            type="checkbox"
                            checked={selectedQuotaPlanIds.includes(pid)}
                            onChange={() => {
                              setSelectedQuotaPlanIds((prev) =>
                                prev.includes(pid) ? prev.filter((x) => x !== pid) : [...prev, pid]
                              );
                            }}
                            disabled={isFetching}
                          />
                          <span className="checkbox-content">{label}</span>
                        </label>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {idNum > 0 && (serverData.serverType ?? VpnServerType.OpenVpn) === VpnServerType.OpenVpn && (
              <>
                <h3 className="ovpn-config-section-title">OpenVPN file config</h3>
                <div className="form-group">
                  <label htmlFor="VpnServerIp">VPN Server IP *</label>
                  <input
                    type="text"
                    id="VpnServerIp"
                    name="vpnServerIp"
                    value={ovpnConfig.vpnServerIp}
                    onChange={handleTextChange}
                    className={errors.vpnServerIp ? "input-error" : ""}
                    placeholder="Enter VPN Server IP"
                    disabled={isFetching}
                  />
                  {errors.vpnServerIp && <p className="error-message">{errors.vpnServerIp}</p>}
                </div>

                <div className="form-group">
                  <label htmlFor="VpnServerPort">VPN Server Port *</label>
                  <input
                    type="number"
                    id="VpnServerPort"
                    name="vpnServerPort"
                    value={ovpnConfig.vpnServerPort}
                    onChange={handleTextChange}
                    className={errors.vpnServerPort ? "input-error" : ""}
                    placeholder="1194"
                    disabled={isFetching}
                  />
                  {errors.vpnServerPort && <p className="error-message">{errors.vpnServerPort}</p>}
                </div>

                <div className="form-group">
                  <div className="config-template-container">
                    <div className="toolbar">
                      <span>Config Template</span>
                      <button
                        className="btn secondary"
                        type="button"
                        onClick={handleCopyConfig}
                      >
                        {FaCopy({})} {copyStatus}
                      </button>
                    </div>
                    <div className="ovpn-textarea-wrap">
                      <pre
                        className="ovpn-highlight-pre"
                        aria-hidden
                        ref={highlightPreRef}
                      >
                        {highlightOvpnConfig(ovpnConfig.configTemplate || " ")}
                      </pre>
                      <textarea
                        id="ConfigTemplate"
                        name="configTemplate"
                        value={ovpnConfig.configTemplate}
                        onChange={handleTextChange}
                        onScroll={() => {
                          if (highlightPreRef.current && configTextareaRef.current) {
                            highlightPreRef.current.scrollTop = configTextareaRef.current.scrollTop;
                            highlightPreRef.current.scrollLeft = configTextareaRef.current.scrollLeft;
                          }
                        }}
                        placeholder="OpenVPN config template with {{server_ip}}, {{client_cert}}, etc."
                        className="ovpn-textarea-overlay"
                        ref={configTextareaRef}
                        disabled={isFetching}
                      />
                    </div>
                  </div>
                </div>
              </>
            )}

            {!idNum && <PostSetupProgressPanel ui={postSetupUi} />}

            <div className="header-containe">
              <div className="header-bar">
                <div className="left-buttons">
                  <button
                    type="button"
                    className="btn secondary"
                    onClick={() => navigate(`/`)}
                    disabled={postSetupBusy}
                  >
                    {FaArrowLeft({ className: "icon" })} Back
                  </button>
                </div>
                <div className="right-buttons">
                  <button
                      type="submit"
                      className="btn primary"
                      disabled={
                    postSetupBusy ||
                    (idNum > 0 && !quotaPlansHydrated) ||
                    addMutation.isPending ||
                    updateMutation.isPending ||
                    (((serverData.serverType ?? VpnServerType.OpenVpn) === VpnServerType.OpenVpn) &&
                      saveOvpnConfigMutation.isPending)
                  }
                  >
                    {FaPlus({ className: "icon" })}{" "}
                    {postSetupBusy
                      ? "Configuring server…"
                      : addMutation.isPending
                        ? "Saving server…"
                        : idNum
                          ? "Update Server"
                          : "Add Server"}
                  </button>
                </div>
              </div>
            </div>
          </form>
        </div>
      </div>
  );
};

export default ServerForm;
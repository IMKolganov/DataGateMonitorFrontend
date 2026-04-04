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
} from "../api/orval/open-vpn-servers/open-vpn-servers";

import {
  useGetApiOpenVpnConfigsGetVpnServerId,
  usePostApiOpenVpnConfigsAddUpdate,
} from "../api/orval/open-vpn-server-ovpn-file-config/open-vpn-server-ovpn-file-config";

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
  OpenVpnServerDto,
  OvpnFileConfigResponse,
  QuotaPlanDto,
  QuotaPlansResponse,
  QuotaPlanAllowedServerDto,
  OpenVpnServerResponse,
} from "../api/orval/model";
import { highlightOvpnConfig } from "../utils/ovpnConfigHighlight";
import { usePostApiQuotaPlansGetAll } from "../api/orval/quota-plan/quota-plan";
import {
  useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId,
  postApiQuotaPlanAllowedServersCreate,
  deleteApiQuotaPlanAllowedServersDeleteId,
  getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey,
} from "../api/orval/quota-plan-allowed-server/quota-plan-allowed-server";
import { getGetApiV2OpenVpnServersGetAllWithStatusQueryKey } from "../api/orval/open-vpn-servers-v2/open-vpn-servers-v2";
import {
  getGetApiOpenVpnServersGetVpnServerIdQueryKey,
  getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey,
} from "../api/orval/open-vpn-servers/open-vpn-servers";
import type { ApiEnvelope } from "./TelegramBotSettings/unwrapApiResponse";
import { unwrapMaybeApiResponse } from "./TelegramBotSettings/unwrapApiResponse";
import { errorMessage } from "../utils/errorMessage";
import axios from "axios";

type GetByIdResult = Awaited<ReturnType<typeof getApiOpenVpnServersGetVpnServerId>>;

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : null;
}

function unwrapServerDto(raw: GetByIdResult | undefined): OpenVpnServerDto | null {
  if (!raw) return null;

  const top = asRecord(raw);
  if (!top) return null;
  const data = asRecord(top["data"]);
  const s =
    (top["openVpnServer"] as unknown) ??
    data?.["openVpnServer"] ??
    raw;

  if (!s || typeof s !== "object") return null;
  const o = s as Record<string, unknown>;

  const dto: OpenVpnServerDto = {
    id: typeof o["id"] === "number" ? o["id"] : o["id"] != null ? Number(o["id"]) : undefined,
    serverName: (o["serverName"] as string | null | undefined) ?? null,
    isOnline: Boolean(o["isOnline"] ?? false),
    isDefault: Boolean(o["isDefault"] ?? false),
    apiUrl: (o["apiUrl"] as string | null | undefined) ?? null,
    latitude: (o["latitude"] as number | null | undefined) ?? null,
    longitude: (o["longitude"] as number | null | undefined) ?? null,
    isEnableWss: Boolean(o["isEnableWss"] ?? false),
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
  const top = unwrapMaybeApiResponse<OpenVpnServerResponse>(
    raw as OpenVpnServerResponse | ApiEnvelope<OpenVpnServerResponse> | undefined,
  );
  const rawRec = asRecord(raw);
  const nested = rawRec ? asRecord(rawRec["data"]) : null;
  const fromRaw =
    (rawRec?.["openVpnServer"] as { id?: number } | undefined)?.id ??
    (nested?.["openVpnServer"] as { id?: number } | undefined)?.id;
  const id = top?.openVpnServer?.id ?? fromRaw;
  return typeof id === "number" && id > 0 ? id : null;
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

function ApiCheckSuccessSummary({ data }: { data: unknown }) {
  const rec = asRecord(data);
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

  const { data: ovpnConfigData } = useGetApiOpenVpnConfigsGetVpnServerId(idNum, {
    query: { enabled: idNum > 0 },
  });

  const { data: tagsResp } = useGetApiTagsGetAll();

  const getPlansMutation = usePostApiQuotaPlansGetAll();
  const [quotaPlans, setQuotaPlans] = React.useState<QuotaPlanDto[]>([]);
  const [selectedQuotaPlanIds, setSelectedQuotaPlanIds] = React.useState<number[]>([]);
  const quotaInitForServerRef = React.useRef<number | null>(null);

  const { data: allowedByServerRaw } = useGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerId(idNum, {
    query: { enabled: idNum > 0 },
  });

  const allTags = React.useMemo(() => {
    const raw = tagsResp as { tags?: { id?: number; name?: string | null }[]; data?: { tags?: { id?: number; name?: string | null }[] } } | undefined;
    return raw?.tags ?? raw?.data?.tags ?? [];
  }, [tagsResp]);

  const addMutation = usePostApiOpenVpnServersAdd();
  const updateMutation = usePutApiOpenVpnServersUpdate();
  const saveOvpnConfigMutation = usePostApiOpenVpnConfigsAddUpdate();

  const [serverData, setServerData] = React.useState<OpenVpnServerDto>({
    id: idNum || undefined,
    serverName: "",
    isOnline: false,
    isDefault: false,
    apiUrl: null,
    latitude: null,
    longitude: null,
    isEnableWss: false,
    createDate: new Date().toISOString(),
    lastUpdate: new Date().toISOString(),
  });

  const [selectedTagIds, setSelectedTagIds] = React.useState<number[]>([]);
  const [newTagName, setNewTagName] = React.useState("");
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
    configTemplate: "",
  });

  const [copyStatus, setCopyStatus] = React.useState<"Copy" | "Copied!">("Copy");

  React.useEffect(() => {
    quotaInitForServerRef.current = null;
    if (!idNum) setSelectedQuotaPlanIds([]);
  }, [idNum]);

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

  React.useEffect(() => {
    if (!idNum || !allowedByServerRaw) return;
    if (quotaInitForServerRef.current === idNum) return;
    const items = getAllowedItemsByVpnServer(allowedByServerRaw);
    setSelectedQuotaPlanIds(
      items
        .map((i) => i.quotaPlanId)
        .filter((x): x is number => typeof x === "number")
    );
    quotaInitForServerRef.current = idNum;
  }, [idNum, allowedByServerRaw]);

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

  React.useEffect(() => {
    if (!serverResp) return;

    const dto = unwrapServerDto(serverResp);
    if (!dto) return;

    setServerData((prev) => ({
      ...prev,
      ...dto,
      id: dto.id ?? prev.id ?? (idNum || undefined),
      serverName: dto.serverName ?? "",
      apiUrl: dto.apiUrl ?? null,
      latitude: dto.latitude ?? null,
      longitude: dto.longitude ?? null,
      isOnline: dto.isOnline ?? false,
      isDefault: dto.isDefault ?? false,
      isEnableWss: dto.isEnableWss ?? false,
      lastUpdate: dto.lastUpdate ?? prev.lastUpdate,
      createDate: dto.createDate ?? prev.createDate,
    }));

    const tagNames = dto.tags ?? [];
    const ids =
      tagNames.length > 0 && allTags.length > 0
        ? allTags
            .filter((t) => t.name != null && tagNames.includes(t.name))
            .map((t) => t.id!)
            .filter((id): id is number => typeof id === "number")
        : [];
    setSelectedTagIds(ids);
  }, [serverResp, idNum, allTags]);

  React.useEffect(() => {
    const raw = ovpnConfigData as OvpnFileConfigResponse | undefined;
    if (!raw || typeof raw !== "object") return;
    setOvpnConfig((prev) => ({
      ...prev,
      vpnServerIp: raw.vpnServerIp ?? "",
      vpnServerPort: Number(raw.vpnServerPort ?? 1194),
      configTemplate: raw.configTemplate ?? "",
    }));
  }, [ovpnConfigData]);

  const validateForm = () => {
    let ok = true;
    const next = { serverName: "", vpnServerIp: "", vpnServerPort: "" };

    if (!String(serverData.serverName ?? "").trim()) {
      next.serverName = "Server name is required.";
      ok = false;
    }

    if (idNum > 0) {
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

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    if (name === "serverName") {
      setServerData((p) => ({ ...p, serverName: value }));
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
      const data = await getApiOpenVpnServersGetMicroserviceInfoByUrl({
        baseUrl: targetUrl,
      });
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
  }, [serverData.apiUrl]);

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

    if (name === "isEnableWss") {
      setServerData((p) => ({ ...p, isEnableWss: checked }));
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
      queryClient.invalidateQueries({ queryKey: getGetApiV2OpenVpnServersGetAllWithStatusQueryKey(undefined) });
      queryClient.invalidateQueries({ queryKey: getGetApiOpenVpnServersGetVpnServerIdQueryKey(vpnServerId) });
      queryClient.invalidateQueries({
        queryKey: getGetApiOpenVpnServersGetServerWithStatusVpnServerIdQueryKey(vpnServerId),
      });
    };

    try {
      if (idNum) {
        const payload: UpdateServerRequest = {
          id: Number(serverData.id ?? idNum),
          serverName: String(serverData.serverName ?? "").trim(),
          apiUrl: serverData.apiUrl ?? null,
          isDefault: serverData.isDefault ?? false,
          isOnline: serverData.isOnline ?? false,
          latitude: serverData.latitude ?? null,
          longitude: serverData.longitude ?? null,
          isEnableWss: serverData.isEnableWss ?? false,
          tagIds: selectedTagIds,
        };

        await updateMutation.mutateAsync({ data: payload });

        await saveOvpnConfigMutation.mutateAsync({
          data: {
            vpnServerId: idNum,
            vpnServerIp: String(ovpnConfig.vpnServerIp ?? "").trim(),
            vpnServerPort: ovpnConfig.vpnServerPort || 1194,
            configTemplate: ovpnConfig.configTemplate || null,
          },
        });

        const prevRaw =
          queryClient.getQueryData(
            getGetApiQuotaPlanAllowedServersGetByVpnServerIdVpnServerIdQueryKey(idNum)
          ) ?? allowedByServerRaw;
        const previousLinks = getAllowedItemsByVpnServer(prevRaw);

        try {
          await syncQuotaPlanAssignments(idNum, previousLinks, selectedQuotaPlanIds);
        } catch (quotaErr: unknown) {
          const msg =
            quotaErr instanceof Error
              ? quotaErr.message
              : typeof quotaErr === "object" && quotaErr != null && "message" in quotaErr
                ? String((quotaErr as { message: unknown }).message)
                : "Quota plan links failed";
          toast.error(`Server saved, but quota plans: ${msg}`);
        }

        invalidateQuotaCaches(idNum);
        toast.success("Server and OpenVPN config updated successfully!");
      } else {
        const payload: AddServerRequest = {
          serverName: String(serverData.serverName ?? "").trim(),
          apiUrl: serverData.apiUrl ?? null,
          isDefault: serverData.isDefault ?? false,
          isOnline: serverData.isOnline ?? false,
          latitude: serverData.latitude ?? null,
          longitude: serverData.longitude ?? null,
          isEnableWss: serverData.isEnableWss ?? false,
          tagIds: selectedTagIds,
        };

        const addResult = await addMutation.mutateAsync({ data: payload });
        const newId = unwrapNewServerIdFromAdd(addResult);

        if (newId) {
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
            queryKey: getGetApiV2OpenVpnServersGetAllWithStatusQueryKey(undefined),
          });
        }

        toast.success("Server added successfully!");
      }

      navigate("/");
    } catch (err: unknown) {
      const base = idNum ? "Failed to update server." : "Failed to add server.";
      let apiMsg = base;
      if (axios.isAxiosError(err)) {
        const d = err.response?.data;
        if (d && typeof d === "object" && d !== null) {
          const rec = d as Record<string, unknown>;
          const m = rec["Message"] ?? rec["message"];
          if (typeof m === "string") apiMsg = m;
        } else if (err.message) apiMsg = err.message;
      } else {
        apiMsg = errorMessage(err) || base;
      }
      toast.error(apiMsg);
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
                  placeholder="e.g. http://95.111.204.102:4009/"
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
                    <div key={tag.id ?? tag.name ?? Math.random()} className="tags-checkbox-item tags-checkbox-row">
                      <label className="checkbox-label tags-checkbox-item-inner">
                        <input
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
                {visibleQuotaPlans.length === 0 ? (
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

            {idNum > 0 && (
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

            <div className="header-containe">
              <div className="header-bar">
                <div className="left-buttons">
                  <button type="button" className="btn secondary" onClick={() => navigate(`/`)}>
                    {FaArrowLeft({ className: "icon" })} Back
                  </button>
                </div>
                <div className="right-buttons">
                  <button
                      type="submit"
                      className="btn primary"
                      disabled={addMutation.isPending || updateMutation.isPending || saveOvpnConfigMutation.isPending}
                  >
                    {FaPlus({ className: "icon" })} {idNum ? "Update Server" : "Add Server"}
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
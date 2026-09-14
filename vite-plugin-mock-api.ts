import type { Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";

type Json = Record<string, unknown> | unknown[];

function envelope(data: Json | null): string {
  return JSON.stringify({ success: true, data, errorMessage: null });
}

function sendJson(res: ServerResponse, body: string, status = 200): void {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.setHeader("Cache-Control", "no-store");
  res.end(body);
}

function pathnameOf(req: IncomingMessage): string {
  const raw = req.url ?? "/";
  try {
    return new URL(raw, "http://127.0.0.1").pathname;
  } catch {
    return raw.split("?")[0] ?? "/";
  }
}

const nowIso = () => new Date().toISOString();

type MockGroup = { id: number; name: string; sortOrder: number; serverIds: number[] };

let nextMockGroupId = 11;
let mockGroups: MockGroup[] = [{ id: 10, name: "EU", sortOrder: 0, serverIds: [1, 3] }];

function cloneGroups(): MockGroup[] {
  return mockGroups.map((g) => ({ ...g, serverIds: [...g.serverIds] }));
}

function groupForServer(serverId: number): MockGroup | undefined {
  return mockGroups.find((g) => g.serverIds.includes(serverId));
}

function removeServerFromAllGroups(serverId: number): void {
  for (const g of mockGroups) {
    g.serverIds = g.serverIds.filter((id) => id !== serverId);
  }
}

function setNamedGroupServers(groupId: number, vpnServerIds: number[]): MockGroup | null {
  const group = mockGroups.find((g) => g.id === groupId);
  if (!group) return null;
  for (const id of vpnServerIds) removeServerFromAllGroups(id);
  group.serverIds = [...vpnServerIds];
  return group;
}

function setUngroupedServers(vpnServerIds: number[]): void {
  for (const id of vpnServerIds) removeServerFromAllGroups(id);
}

function readJsonBody(req: IncomingMessage): Promise<Record<string, unknown>> {
  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on("data", (chunk) => {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    });
    req.on("end", () => {
      if (chunks.length === 0) {
        resolve({});
        return;
      }
      try {
        const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
        resolve(parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function asIdList(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return value.filter((id): id is number => typeof id === "number");
}

function stubVpnServer(id: number, name: string, serverType: 0 | 1, extra?: Record<string, unknown>) {
  const group = groupForServer(id);
  return {
    id,
    serverType,
    serverName: name,
    isOnline: true,
    isDefault: id === 1,
    apiUrl: `https://vpn-${id}.mock.local`,
    latitude: id === 1 ? 60.17 : 50.11,
    longitude: id === 1 ? 24.94 : 8.68,
    isEnableWss: true,
    createDate: nowIso(),
    lastUpdate: nowIso(),
    isDeleted: false,
    tags: ["mock"],
    groupId: group?.id ?? null,
    groupName: group?.name ?? null,
    sortOrder: id,
    isAccessibleForUserQuotaPlan: true,
    isDisabled: false,
    ...extra,
  };
}

type MockServerRecord = {
  id: number;
  name: string;
  serverType: 0 | 1;
  fields: Record<string, unknown>;
  status: Record<string, unknown>;
  countConnectedClients: number;
  countSessions: number;
  totalBytesIn: number;
  totalBytesOut: number;
};

let nextMockServerId = 4;
let mockServerStore: MockServerRecord[] = [
  {
    id: 1,
    name: "Helsinki OpenVPN",
    serverType: 0,
    fields: {},
    status: {
      vpnServerId: 1,
      sessionId: "mock-session-1",
      upSince: nowIso(),
      serverLocalIp: "10.8.0.1",
      serverRemoteIp: "203.0.113.10",
      bytesIn: 128_000_000,
      bytesOut: 64_000_000,
      version: "2.6.12",
    },
    countConnectedClients: 3,
    countSessions: 11,
    totalBytesIn: 128_000_000,
    totalBytesOut: 64_000_000,
  },
  {
    id: 2,
    name: "Frankfurt Xray",
    serverType: 1,
    fields: {},
    status: {
      vpnServerId: 2,
      sessionId: "mock-session-2",
      upSince: nowIso(),
      bytesIn: 32_000_000,
      bytesOut: 18_000_000,
      version: "1.8.0",
    },
    countConnectedClients: 1,
    countSessions: 4,
    totalBytesIn: 32_000_000,
    totalBytesOut: 18_000_000,
  },
  {
    id: 3,
    name: "Tallinn OpenVPN",
    serverType: 0,
    fields: { latitude: 59.44, longitude: 24.75 },
    status: {
      vpnServerId: 3,
      sessionId: "mock-session-3",
      upSince: nowIso(),
      serverLocalIp: "10.8.0.3",
      serverRemoteIp: "203.0.113.30",
      bytesIn: 48_000_000,
      bytesOut: 22_000_000,
      version: "2.6.12",
    },
    countConnectedClients: 2,
    countSessions: 6,
    totalBytesIn: 48_000_000,
    totalBytesOut: 22_000_000,
  },
];

function findStoredServer(id: number): MockServerRecord | undefined {
  return mockServerStore.find((s) => s.id === id);
}

function vpnServerFromStore(row: MockServerRecord) {
  return stubVpnServer(row.id, row.name, row.serverType, row.fields);
}

function serversWithStatus() {
  return {
    vpnServerWithStatuses: mockServerStore.map((row) => ({
      vpnServerResponses: { vpnServer: vpnServerFromStore(row) },
      vpnServerStatusLogResponse: row.status,
      countConnectedClients: row.countConnectedClients,
      countSessions: row.countSessions,
      totalBytesIn: row.totalBytesIn,
      totalBytesOut: row.totalBytesOut,
    })),
  };
}

function completedPostSetup(vpnServerId: number) {
  return {
    vpnServerId,
    operationId: `mock-setup-${vpnServerId}`,
    state: 2,
    currentStep: "completed",
    message: "Mock post-create setup finished.",
  };
}

function overviewSeries() {
  const rows = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    d.setHours(12, 0, 0, 0);
    return {
      ts: d.toISOString(),
      activeClients: 2 + (i % 3),
      trafficInBytes: 12_000_000 + i * 1_500_000,
      trafficOutBytes: 6_000_000 + i * 800_000,
      trafficTotalBytes: 18_000_000 + i * 2_300_000,
    };
  });
  return {
    overviewSeriesRows: rows,
    summary: {
      totalTrafficInBytes: 90_000_000,
      totalTrafficOutBytes: 48_000_000,
      peakActiveClients: 5,
    },
  };
}

type MockUser = {
  id: number;
  displayName: string;
  email: string;
  isAdmin?: boolean;
  isBlocked?: boolean;
  hasDashboardAccess?: boolean;
  provider?: string;
  externalId?: string | null;
};

const mockUsers: MockUser[] = [
  {
    id: 1,
    displayName: "Mock Admin",
    email: "admin@mock.local",
    isAdmin: true,
    hasDashboardAccess: true,
    provider: "password",
  },
  {
    id: 2,
    displayName: "Alice",
    email: "alice@mock.local",
    hasDashboardAccess: true,
    provider: "google",
  },
  {
    id: 3,
    displayName: "Bob",
    email: "bob@mock.local",
    provider: "telegram",
    externalId: "10001",
  },
];

type MockAccessRule = { id: number; userId: number; vpnServerId: number; mode: 1 | 2 };

let nextMockAccessRuleId = 2;
let mockAccessRules: MockAccessRule[] = [{ id: 1, userId: 2, vpnServerId: 1, mode: 1 }];

type MockQuotaLink = { id: number; quotaPlanId: number; vpnServerId: number };
let nextMockQuotaLinkId = 2;
let mockQuotaLinks: MockQuotaLink[] = [{ id: 1, quotaPlanId: 4, vpnServerId: 1 }];

function toUserDto(user: MockUser) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    avatarUrl: null,
    isAdmin: Boolean(user.isAdmin),
    isBlocked: Boolean(user.isBlocked),
    hasDashboardAccess: Boolean(user.hasDashboardAccess),
    provider: user.provider ?? null,
    externalId: user.externalId ?? null,
    createDate: nowIso(),
    lastUpdate: nowIso(),
  };
}

function mockPayload(
  pathname: string,
  method: string,
  body: Record<string, unknown> = {},
  search: URLSearchParams = new URLSearchParams(),
): Json | null {
  if (pathname.includes("/api/hubs/")) {
    return { error: "SignalR is disabled in mock mode" };
  }

  if (pathname.endsWith("/api/auth/totp/status")) {
    return { isAdmin: true, totpEnabled: true, requiresTotpSetup: false };
  }
  if (pathname.endsWith("/api/auth/session-policy")) {
    return { adminIdleTimeoutMinutes: 480 };
  }
  if (pathname.endsWith("/api/notifications/unread-count")) {
    return { count: 2 };
  }
  if (pathname.endsWith("/api/notifications/get-all")) {
    return { notifications: [], totalCount: 0 };
  }
  if (pathname.endsWith("/api/vpn-server-groups/get-all")) {
    return { groups: cloneGroups() };
  }
  if (method === "PUT" && pathname.endsWith("/api/vpn-server-groups/reorder")) {
    const items = Array.isArray(body.items) ? body.items : [];
    const order = new Map<number, number>();
    for (const item of items) {
      if (!item || typeof item !== "object") continue;
      const rec = item as { groupId?: unknown; sortOrder?: unknown };
      const groupId = Number(rec.groupId);
      const sortOrder = Number(rec.sortOrder);
      if (Number.isFinite(groupId) && Number.isFinite(sortOrder)) order.set(groupId, sortOrder);
    }
    mockGroups = [...mockGroups]
      .sort((a, b) => (order.get(a.id) ?? a.sortOrder) - (order.get(b.id) ?? b.sortOrder))
      .map((g) => ({ ...g, sortOrder: order.get(g.id) ?? g.sortOrder }));
    return {};
  }
  if (method === "POST" && pathname.endsWith("/api/vpn-server-groups/create")) {
    const name = String(body.name ?? "").trim() || "Group";
    const group: MockGroup = {
      id: nextMockGroupId++,
      name,
      sortOrder: mockGroups.length,
      serverIds: [],
    };
    mockGroups = [...mockGroups, group];
    return { group: { ...group, serverIds: [...group.serverIds] } };
  }
  const updateGroup = pathname.match(/\/api\/vpn-server-groups\/update\/(\d+)$/);
  if (method === "PUT" && updateGroup) {
    const id = Number(updateGroup[1]);
    const group = mockGroups.find((g) => g.id === id);
    if (!group) return { group: null };
    const name = String(body.name ?? group.name).trim();
    if (name) group.name = name;
    return { group: { ...group, serverIds: [...group.serverIds] } };
  }
  const deleteGroup = pathname.match(/\/api\/vpn-server-groups\/delete\/(\d+)$/);
  if (method === "DELETE" && deleteGroup) {
    const id = Number(deleteGroup[1]);
    mockGroups = mockGroups.filter((g) => g.id !== id);
    return {};
  }
  const setServers = pathname.match(/\/api\/vpn-server-groups\/(\d+)\/set-servers$/);
  if (method === "PUT" && setServers) {
    const id = Number(setServers[1]);
    const group = setNamedGroupServers(id, asIdList(body.vpnServerIds));
    return { group: group ? { ...group, serverIds: [...group.serverIds] } : null };
  }
  if (method === "PUT" && pathname.endsWith("/api/vpn-server-groups/ungrouped/set-servers")) {
    setUngroupedServers(asIdList(body.vpnServerIds));
    return {};
  }
  if (pathname.includes("/discoveries/pending")) {
    return { discoveries: [] };
  }
  if (pathname.endsWith("/api/v3/open-vpn-servers/get-all-with-status")) {
    return serversWithStatus();
  }
  if (pathname.endsWith("/api/v3/open-vpn-servers/get-all")) {
    return {
      vpnServers: serversWithStatus().vpnServerWithStatuses.map(
        (row) => row.vpnServerResponses.vpnServer,
      ),
    };
  }

  if (method === "POST" && pathname.endsWith("/api/open-vpn-servers/add")) {
    const id = nextMockServerId++;
    const serverType: 0 | 1 = Number(body.serverType) === 1 ? 1 : 0;
    const name = String(body.serverName ?? "").trim() || `Server ${id}`;
    const fields: Record<string, unknown> = {
      isOnline: Boolean(body.isOnline),
      isDefault: Boolean(body.isDefault),
      isDisabled: Boolean(body.isDisabled),
      apiUrl: body.apiUrl ?? `https://vpn-${id}.mock.local`,
      latitude: typeof body.latitude === "number" ? body.latitude : null,
      longitude: typeof body.longitude === "number" ? body.longitude : null,
      isEnableWss: Boolean(body.isEnableWss),
      isPiHoleEnabled: Boolean(body.isPiHoleEnabled),
      tags: [],
    };
    mockServerStore.push({
      id,
      name,
      serverType,
      fields,
      status: {
        vpnServerId: id,
        sessionId: `mock-session-${id}`,
        upSince: nowIso(),
        version: "mock",
      },
      countConnectedClients: 0,
      countSessions: 0,
      totalBytesIn: 0,
      totalBytesOut: 0,
    });
    return { vpnServer: stubVpnServer(id, name, serverType, fields) };
  }

  if (method === "PUT" && pathname.endsWith("/api/open-vpn-servers/update")) {
    const id = Number(body.id);
    const row = findStoredServer(id);
    if (!row) return { vpnServer: null };
    if (typeof body.serverName === "string" && body.serverName.trim()) row.name = body.serverName.trim();
    row.fields = {
      ...row.fields,
      isOnline: body.isOnline ?? row.fields.isOnline,
      isDefault: body.isDefault ?? row.fields.isDefault,
      isDisabled: body.isDisabled ?? row.fields.isDisabled,
      apiUrl: body.apiUrl !== undefined ? body.apiUrl : row.fields.apiUrl,
      latitude: body.latitude !== undefined ? body.latitude : row.fields.latitude,
      longitude: body.longitude !== undefined ? body.longitude : row.fields.longitude,
      isEnableWss: body.isEnableWss ?? row.fields.isEnableWss,
      isPiHoleEnabled: body.isPiHoleEnabled ?? row.fields.isPiHoleEnabled,
      lastUpdate: nowIso(),
    };
    return { vpnServer: vpnServerFromStore(row) };
  }

  const deleteServer = pathname.match(/\/api\/open-vpn-servers\/delete\/(\d+)$/);
  if (method === "DELETE" && deleteServer) {
    const id = Number(deleteServer[1]);
    mockServerStore = mockServerStore.filter((s) => s.id !== id);
    removeServerFromAllGroups(id);
    return {};
  }

  const postSetupStart = pathname.match(/\/api\/open-vpn-servers\/post-setup\/(\d+)\/start$/);
  if (method === "POST" && postSetupStart) {
    return completedPostSetup(Number(postSetupStart[1]));
  }
  const postSetupStatus = pathname.match(/\/api\/open-vpn-servers\/post-setup\/(\d+)\/status$/);
  if (postSetupStatus) {
    return completedPostSetup(Number(postSetupStatus[1]));
  }

  if (pathname.endsWith("/api/open-vpn-configs/add-update")) {
    return {};
  }
  const ovpnGet = pathname.match(/\/api\/open-vpn-configs\/get\/(\d+)$/);
  if (ovpnGet) {
    return { vpnServerOvpnFileConfig: null };
  }

  if (pathname.endsWith("/api/tags/get-all")) {
    return { tags: [] };
  }
  if (pathname.includes("/api/quota-plans/get-all") || pathname.endsWith("/api/quota-plans/get-all")) {
    return {
      quotaPlans: [
        {
          id: 1,
          name: "Free",
          description: "Entry plan (5 GB/day, 20 GB/month)",
          dailyQuotaBytes: 5 * 1024 ** 3,
          monthlyQuotaBytes: 20 * 1024 ** 3,
          isActive: true,
          isDefault: false,
        },
        {
          id: 2,
          name: "Default",
          description: "Default plan (10 GB/day, 50 GB/month)",
          dailyQuotaBytes: 10 * 1024 ** 3,
          monthlyQuotaBytes: 50 * 1024 ** 3,
          isActive: true,
          isDefault: true,
        },
        {
          id: 3,
          name: "Standard",
          description: "Balanced plan (20 GB/day, 100 GB/month)",
          dailyQuotaBytes: 20 * 1024 ** 3,
          monthlyQuotaBytes: 100 * 1024 ** 3,
          isActive: true,
        },
        {
          id: 4,
          name: "Pro",
          description: "Heavy users (50 GB/day, 300 GB/month)",
          dailyQuotaBytes: 50 * 1024 ** 3,
          monthlyQuotaBytes: 300 * 1024 ** 3,
          isActive: true,
        },
        {
          id: 5,
          name: "Unlimited",
          description: "No traffic limits",
          isActive: true,
        },
      ],
    };
  }
  const quotaByServer = pathname.match(/\/api\/quota-plan-allowed-servers\/get-by-vpn-server-id\/(\d+)$/);
  if (quotaByServer) {
    const vpnServerId = Number(quotaByServer[1]);
    return { items: mockQuotaLinks.filter((row) => row.vpnServerId === vpnServerId) };
  }
  if (method === "POST" && pathname.endsWith("/api/quota-plan-allowed-servers/create")) {
    const quotaPlanId = Number(body.quotaPlanId);
    const vpnServerId = Number(body.vpnServerId);
    const existing = mockQuotaLinks.find(
      (row) => row.quotaPlanId === quotaPlanId && row.vpnServerId === vpnServerId,
    );
    if (existing) return { quotaPlanAllowedServer: existing };
    const created = { id: nextMockQuotaLinkId++, quotaPlanId, vpnServerId };
    mockQuotaLinks = [...mockQuotaLinks, created];
    return { quotaPlanAllowedServer: created };
  }
  const deleteQuotaLink = pathname.match(/\/api\/quota-plan-allowed-servers\/delete\/(\d+)$/);
  if (method === "DELETE" && deleteQuotaLink) {
    const id = Number(deleteQuotaLink[1]);
    mockQuotaLinks = mockQuotaLinks.filter((row) => row.id !== id);
    return {};
  }

  const getById = pathname.match(/\/api\/open-vpn-servers\/get\/(\d+)$/);
  if (getById) {
    const id = Number(getById[1]);
    const row =
      serversWithStatus().vpnServerWithStatuses.find((item) => item.vpnServerResponses.vpnServer.id === id) ??
      serversWithStatus().vpnServerWithStatuses[0];
    return { vpnServer: row.vpnServerResponses.vpnServer };
  }

  const getWithStatus = pathname.match(/\/api\/open-vpn-servers\/get-server-with-status\/(\d+)$/);
  if (getWithStatus) {
    const id = Number(getWithStatus[1]);
    return (
      serversWithStatus().vpnServerWithStatuses.find((item) => item.vpnServerResponses.vpnServer.id === id) ??
      serversWithStatus().vpnServerWithStatuses[0]
    );
  }
  if (pathname.includes("/api/open-vpn-clients/overview/summary")) {
    return {
      totals: {
        sessionsCount: 15,
        usersCount: 4,
        accountsCount: 3,
        trafficInBytes: 160_000_000,
        trafficOutBytes: 82_000_000,
        trafficTotalBytes: 242_000_000,
      },
    };
  }
  if (pathname.includes("/api/open-vpn-clients/overview/series")) {
    return overviewSeries();
  }
  if (pathname.includes("/api/open-vpn-clients/overview/users/series")) {
    return { rows: [] };
  }
  if (pathname.includes("/api/open-vpn-clients/overview/users")) {
    return { overviewUserItems: [] };
  }
  if (pathname.includes("/api/open-vpn-clients/overview/points")) {
    return { points: [] };
  }
  if (pathname.includes("/api/open-vpn-clients/user-connected-server-ids")) {
    return { vpnServerIds: [1] };
  }
  if (pathname.includes("/api/open-vpn-clients/get-all-connected")) {
    return { clients: [] };
  }
  if (pathname.includes("/healthcheck")) {
    return { status: "ok", mock: true };
  }

  if (pathname.endsWith("/api/users/get-all")) {
    const q = (search.get("Search") ?? "").trim().toLowerCase();
    let users = mockUsers.filter((user) => {
      if (!q) return true;
      return (
        user.displayName.toLowerCase().includes(q) || user.email.toLowerCase().includes(q)
      );
    });
    const page = Math.max(1, Number(search.get("Page") || 1) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(search.get("PageSize") || 50) || 50));
    const totalCount = users.length;
    const start = (page - 1) * pageSize;
    users = users.slice(start, start + pageSize);
    return { page, pageSize, totalCount, users: users.map(toUserDto) };
  }

  const userById = pathname.match(/\/api\/users\/get-by-id\/(\d+)$/);
  if (userById) {
    const user = mockUsers.find((row) => row.id === Number(userById[1]));
    return { user: user ? toUserDto(user) : null };
  }

  if (pathname.endsWith("/api/user-vpn-server-access-rules/get-all")) {
    const userId = Number(search.get("UserId") || 0);
    const vpnServerId = Number(search.get("VpnServerId") || 0);
    let items = mockAccessRules.filter((rule) => {
      if (userId > 0 && rule.userId !== userId) return false;
      if (vpnServerId > 0 && rule.vpnServerId !== vpnServerId) return false;
      return true;
    });
    const page = Math.max(1, Number(search.get("Page") || 1) || 1);
    const pageSize = Math.min(500, Math.max(1, Number(search.get("PageSize") || 50) || 50));
    const totalCount = items.length;
    const start = (page - 1) * pageSize;
    items = items.slice(start, start + pageSize);
    return { page, pageSize, totalCount, items };
  }

  const rulesByUser = pathname.match(/\/api\/user-vpn-server-access-rules\/get-by-user-id\/(\d+)$/);
  if (rulesByUser) {
    const userId = Number(rulesByUser[1]);
    return { items: mockAccessRules.filter((rule) => rule.userId === userId) };
  }

  const rulesByServer = pathname.match(
    /\/api\/user-vpn-server-access-rules\/get-by-vpn-server-id\/(\d+)$/,
  );
  if (rulesByServer) {
    const vpnServerId = Number(rulesByServer[1]);
    return { items: mockAccessRules.filter((rule) => rule.vpnServerId === vpnServerId) };
  }

  if (method === "POST" && pathname.endsWith("/api/user-vpn-server-access-rules/create")) {
    const userId = Number(body.userId);
    const vpnServerId = Number(body.vpnServerId);
    const mode: 1 | 2 = Number(body.mode) === 2 ? 2 : 1;
    const existing = mockAccessRules.find(
      (rule) => rule.userId === userId && rule.vpnServerId === vpnServerId,
    );
    if (existing) {
      existing.mode = mode;
      return { userVpnServerAccessRule: existing };
    }
    const created: MockAccessRule = { id: nextMockAccessRuleId++, userId, vpnServerId, mode };
    mockAccessRules = [...mockAccessRules, created];
    return { userVpnServerAccessRule: created };
  }

  if (method === "PUT" && pathname.endsWith("/api/user-vpn-server-access-rules/update")) {
    const id = Number(body.id);
    const rule = mockAccessRules.find((row) => row.id === id);
    if (!rule) return {};
    if (typeof body.userId === "number") rule.userId = body.userId;
    if (typeof body.vpnServerId === "number") rule.vpnServerId = body.vpnServerId;
    rule.mode = Number(body.mode) === 2 ? 2 : 1;
    return {};
  }

  const deleteRule = pathname.match(/\/api\/user-vpn-server-access-rules\/delete\/(\d+)$/);
  if (method === "DELETE" && deleteRule) {
    const id = Number(deleteRule[1]);
    mockAccessRules = mockAccessRules.filter((rule) => rule.id !== id);
    return {};
  }

  if (method === "GET") return {};
  return {};
}

export function mockApiPlugin(enabled: boolean): Plugin {
  return {
    name: "mock-api",
    configureServer(server) {
      if (!enabled) return;

      server.middlewares.use((req, res, next) => {
        const pathname = pathnameOf(req);
        if (!pathname.startsWith("/api")) {
          next();
          return;
        }

        const method = (req.method ?? "GET").toUpperCase();
        if (pathname.startsWith("/api/hubs/")) {
          sendJson(res, envelope({ disabled: true }), 404);
          return;
        }

        const finish = async () => {
          const body =
            method === "GET" || method === "HEAD" ? {} : await readJsonBody(req);
          let search = new URLSearchParams();
          try {
            search = new URL(req.url ?? "/", "http://127.0.0.1").searchParams;
          } catch {
            search = new URLSearchParams();
          }
          sendJson(res, envelope(mockPayload(pathname, method, body, search)));
        };
        void finish();
      });
    },
  };
}

export type ChartPoint = { label: string; active: number; mb: number };

export type UsersSeriesChartPoint = {
  label: string;
  activeSessions: number;
  activeUsers: number;
};

/** Merged series: traffic + sessions + active users (one chart) */
export type MergedChartPoint = ChartPoint & { activeUsers?: number };

export type ServerInfo = {
  id: number;
  name: string;
  uptime: string;
  version: string;
  localIp: string;
  remoteIp: string;
  trafficInBytes: number;
  trafficOutBytes: number;
  totalTrafficInBytes: number;
  totalTrafficOutBytes: number;
  connectedClients: number;
  sessionsCount: number;
  apiUrl: string;
  isDefault: boolean;
};

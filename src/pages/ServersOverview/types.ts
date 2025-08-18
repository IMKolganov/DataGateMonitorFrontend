export type ChartPoint = { label: string; active: number; mb: number };

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

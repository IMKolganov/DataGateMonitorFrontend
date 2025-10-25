export interface ServerInfo {
    id: number;
    sessionId: string;
    upSince: string;
    serverLocalIp: string;
    serverRemoteIp: string;
    bytesIn: number;
    bytesOut: number;
    version: string;
    lastUpdate: string;
    createDate: string;
  }  
  
  export interface ConnectedClient {
    id: number;
    username: string;
    sessionId: string;
    commonName: string;
    externalId: string,
    tgUsername: string,
    tgFirstName: string,
    tgLastName: string,
    remoteIp: string;
    localIp: string;
    bytesReceived: number;
    bytesSent: number;
    connectedSince: string;
    country: string;
    region: string;
    city: string;
    latitude: number;
    longitude: number;
    lastUpdated: string;
  }

  export interface OpenVpnServerData {
    openVpnServerResponses: {
      id: number;
      serverName: string;
      isOnline: boolean;
      isDefault: boolean;
      apiUrl: string;
    };
    openVpnServerStatusLogResponse: {
      vpnServerId: number;
      sessionId: string;
      upSince: string;
      serverLocalIp: string;
      serverRemoteIp: string;
      bytesIn: number;
      bytesOut: number;
      version: string;
    };
    countConnectedClients: number;
    countSessions: number;
    totalBytesIn: number;
    totalBytesOut: number;
  }
  
  export interface Config {
    defaultRefreshInterval: number;
  }
  export enum CertificateStatus {
    Active = 0,
    Revoked = 1,
    Expired = 2,
    Unknown = 3,
  }
  
  export interface Certificate {
    id: number;
    vpnServerId: number;
    commonName: string;
    certificateData: string;
    issuedAt: string;
    isRevoked: boolean;
    status: number;
    expiryDate: string;
    revokeDate?: string | null;
    serialNumber: string;
  }  
  
  export interface CertificatesTableProps {
    certificates: Certificate[];
    vpnServerId: string;
    onRevoke: () => void;
    loading: boolean;
  }

  export interface IssuedOvpnFile {
    id: number;
    serverId: number;
    externalId: string;
    commonName: string;
    certId?: string;
    fileName: string;
    filePath: string;
    issuedAt: string;
    issuedTo: string;
    pemFilePath: string;
    certFilePath: string;
    keyFilePath: string;
    reqFilePath: string;
    isRevoked: boolean;
    message: string;
    lastUpdate: string;
    createDate: string;
  }  

  export enum ServiceStatus {
    Idle = "Idle",
    Running = "Running",
    Error = "Error",
  }

export type GeoPointAggDto = {
  country: string | null;
  region: string | null;
  latitude: number | null;
  longitude: number | null;
  sessionsCount: number;
  totalBytesIn: number;
  totalBytesOut: number;
};

export type FetchGeoPointsParams = {
  from: Date | string;
  to: Date | string;
  vpnServerId?: number | null;
  externalId?: string | null;
  onlyWithCoordinates?: boolean;
};

export type OverviewTotalsResponse = {
  meta: {
    from: string;        // ISO
    to: string;          // ISO
    grouping: string;    // "none"
    timezone: string;    // "UTC"
    trafficUnit: string; // "bytes"
    vpnServerId?: number | null;
  };
  totals: {
    sessionsCount: number;
    usersCount: number;          // unique ExternalId
    trafficInBytes: number;
    trafficOutBytes: number;
    trafficTotalBytes: number;
  };
};

export type FetchOverviewTotalsParams = {
  from: Date | string;
  to: Date | string;
  vpnServerId?: number | null;
  externalId?: string | null;
};

export type OverviewGrouping = "auto" | "hours" | "days" | "months" | "years";

export type OverviewSeriesRow = {
  ts: string;                 // ISO-8601 (UTC)
  activeClients: number;
  trafficInBytes: number;
  trafficOutBytes: number;
  trafficTotalBytes: number;
};

export type OverviewSeriesMeta = {
  from: string;               // ISO-8601
  to: string;                 // ISO-8601
  grouping: Exclude<OverviewGrouping, "auto">;
  timezone: string;
  trafficUnit: "bytes";       // <-- like on backend
  vpnServerId?: number | null;
};

export type OverviewSeriesSummary = {
  totalTrafficInBytes: number;
  totalTrafficOutBytes: number;
  peakActiveClients: number;
};

export type OverviewSeriesResponse = {
  meta: OverviewSeriesMeta;
  summary: OverviewSeriesSummary;
  series: OverviewSeriesRow[];
};

export type FetchOverviewSeriesParams = {
  from: Date;
  to: Date;
  grouping?: OverviewGrouping;   // default "auto"
  vpnServerId?: number | null;
  externalId?: string | null;
};
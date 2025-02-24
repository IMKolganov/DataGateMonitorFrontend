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
  export interface OpenVpnServer {
    id: number;
    serverName: string;
    managementIp: string;
    managementPort: number;
    login: string;
    password: string;
    isOnline: boolean;
    lastUpdate: string;
    createDate: string;
  }
  
  export interface OpenVpnServerStatusLog {
    id: number;
    vpnServerId: number;
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
  
  export interface OpenVpnServerInfoResponse {
    openVpnServer: OpenVpnServer;
    openVpnServerStatusLog?: OpenVpnServerStatusLog | null;
    totalBytesIn: number;
    totalBytesOut: number;
  }
  
  export interface Config {
    apiBaseUrl: string;
    wsBaseUrl: string;
    webSocketUrl: string;
    defaultRefreshInterval: number;
  }
  export enum CertificateStatus {
    Active = 0,
    Revoked = 1,
    Expired = 2,
    Unknown = 3,
  }
  
  export interface Certificate {
    commonName: string;
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
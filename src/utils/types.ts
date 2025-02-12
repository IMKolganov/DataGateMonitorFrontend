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
    webSocketUrl: string;
    defaultRefreshInterval: number;
  }
  
export interface ServerInfo {
    id: number;
    sessionId: string;
    upSince: string;
    localIp: string;
    remoteIp: string;
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
  
/// <reference types="vite/client" />

/** Direct API origin for SignalR in dev — see `getStatusStreamHubUrl`. */
interface ImportMetaEnv {
  readonly VITE_SIGNALR_ORIGIN?: string;
  /** Dev: "1" = only Long Polling (if API allows); skip WebSocket first. */
  readonly VITE_SIGNALR_LONG_POLLING_ONLY?: string;
  /** Dev: "1" = serve UI against local stubs, no backend. */
  readonly VITE_MOCK_API?: string;
  /** Optional CARTO raster basemap key (`?key=` on cartocdn tile URLs). */
  readonly VITE_CARTO_API_KEY?: string;
}

declare const __APP_VERSION__: string;

/** Optional runtime injection (e.g. GeoLite downloader) */
interface Window {
  __API_BASE_URL__?: string;
}
declare module "*.css";
declare module "*.scss";
declare module "*.sass";
declare module "*.less";
declare module "*.module.css";
declare module "*.module.scss";
declare module "*.module.sass";
declare module "*.module.less";
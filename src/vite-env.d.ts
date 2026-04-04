/// <reference types="vite/client" />
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
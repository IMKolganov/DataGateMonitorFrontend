// config.ts
import fs from "fs";

export interface Config {
  apiBaseUrl: string;
  webSocketUrl: string;
  defaultRefreshInterval: number;
}

const config: Config = JSON.parse(fs.readFileSync("config.json", "utf-8"));

export default config;
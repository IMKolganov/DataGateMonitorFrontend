<h1 align="left">
  <img src="public/favicon.svg" width="32" height="32" alt="" />
  DataGate Monitor — Frontend
</h1>

React + Vite dashboard for [DataGate Monitor](https://dash.datagateapp.com/).

Part of the [DataGateMonitor](https://github.com/IMKolganov/DataGateMonitor) monorepo (`frontend/` submodule). Standalone repo: [DataGateMonitorFrontend](https://github.com/IMKolganov/DataGateMonitorFrontend).

## Links

| Resource | Link |
|----------|------|
| <img src="https://raw.githubusercontent.com/IMKolganov/DataGateMonitorFrontend/main/public/favicon.svg" width="16" height="16" alt="" /> **DataGate app** | [datagateapp.com](https://datagateapp.com/) |
| <img src="https://cdn.simpleicons.org/googleplay/414141" width="16" height="16" alt="" /> **Download** | [datagateapp.com/download](https://datagateapp.com/download) |
| <img src="https://cdn.simpleicons.org/grafana/F46800" width="16" height="16" alt="" /> **Dashboard (prod)** | [dash.datagateapp.com](https://dash.datagateapp.com/) |
| <img src="https://cdn.simpleicons.org/telegram/26A5E4" width="16" height="16" alt="" /> **Telegram channel** | [@datagateapp](https://t.me/datagateapp) |

## Prerequisites

- Node.js **≥24.14.0** (see `package.json` `engines`)
- npm

## Local development

```bash
cd frontend
npm ci
npm run dev
```

| Mode | URL |
|------|-----|
| Vite dev server | http://localhost:5173 |
| Docker (monorepo compose) | http://localhost:5582 |

Set `VITE_APP_NAME=DataGate Monitor` (or your display name) in `.env` / compose env as needed.

API base URL is configured for the dev proxy or nginx in Docker — see monorepo `docker-compose-local.yml` and `BACKEND_INTERNAL_URL`.

## Build

```bash
npm run build
npm run preview   # optional: preview production build
```

## Docker (monorepo)

From the monorepo root:

```bash
docker compose -f docker-compose-local.yml --env-file .env.dev.x64 up -d --build frontend
```

Image: `imkolganov/datagate-monitor-frontend`.

## License

MIT

## Author

**Ivan Kolganov**

| Contact | Link |
|---------|------|
| <img src="https://api.iconify.design/simple-icons/linkedin.svg?color=%230A66C2" width="16" height="16" alt="" /> **LinkedIn** | [linkedin.com/in/imkolganov](https://www.linkedin.com/in/imkolganov/?locale=en) |
| <img src="https://cdn.simpleicons.org/telegram/26A5E4" width="16" height="16" alt="" /> **Telegram** | [@KolganovIvan](https://t.me/KolganovIvan) |
| <img src="https://cdn.simpleicons.org/buymeacoffee/FFDD00" width="16" height="16" alt="" /> **Buy Me a Coffee** | [buymeacoffee.com/imkolganov](https://buymeacoffee.com/imkolganov) |

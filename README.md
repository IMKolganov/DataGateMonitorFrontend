# DataGate Monitor — Frontend

React + Vite dashboard for [DataGate Monitor](https://dash.datagateapp.com/).

Part of the [DataGateMonitor](https://github.com/IMKolganov/DataGateMonitor) monorepo (`frontend/` submodule). Standalone repo: [DataGateMonitorFrontend](https://github.com/IMKolganov/DataGateMonitorFrontend).

## Links

- [DataGate app](https://datagateapp.com/) · [Download](https://datagateapp.com/download)
- [Dashboard (prod)](https://dash.datagateapp.com/) · [Telegram @datagateapp](https://t.me/datagateapp)

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

**Ivan Kolganov** — [LinkedIn](https://www.linkedin.com/in/imkolganov/?locale=en) · [Telegram](https://t.me/KolganovIvan) · [Buy Me a Coffee](https://buymeacoffee.com/imkolganov)

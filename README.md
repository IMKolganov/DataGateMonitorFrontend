# OpenVpnGateMonitor Frontend (React + Vite + TypeScript)

A simple checklist to get the app running on Windows (works on macOS/Linux too). Keep it short, reproducible, and friendly to clean installs.

---

## Requirements
- **Node.js**: **20 LTS** (18+ works, 20 recommended)
- **npm**: 9+
- **Git** (optional, for cloning)
- **VS Code** (optional)

> Verify your versions
```powershell
node -v
npm -v
```

### Recommended: nvm for Windows
Install: https://github.com/coreybutler/nvm-windows

Switch versions:
```powershell
nvm install 20.16.0
nvm use 20.16.0
node -v
```

---

## First run (clean machine)
```powershell
# From the project root
npm install
npm run dev
```
If the browser doesn’t open automatically, navigate to:
- http://localhost:5173/

---

## Scripts
Defined in `package.json`:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "preview": "vite preview"
  }
}
```
Usage:
```powershell
npm run dev      # start dev server
npm run build    # type-check + production build to /dist
npm run preview  # serve /dist locally (after build)
```

---

## Why “'vite' is not recognized” happens
You’ll see this when **node_modules** is missing or broken. `vite` is a local devDependency and is resolved from `node_modules/.bin` by npm scripts.

**Fix:**
```powershell
# Clean & reinstall
rd /s /q node_modules & del package-lock.json
npm install
npm run dev
```

Quick check:
```powershell
npx vite -v       # should print vite version
```

> If this prints a version, your install is fine; re-run `npm run dev`.

---

## Environment variables
Vite exposes only variables prefixed with `VITE_`.

Create **.env.local** (ignored by Git) in the project root:
```dotenv
# Example
VITE_API_BASE_URL=http://localhost:5024
VITE_APP_NAME=OpenVpnGateMonitor
```
Access in code:
```ts
const baseUrl = import.meta.env.VITE_API_BASE_URL;
```

**Common .env files**
- `.env` – shared defaults
- `.env.local` – local overrides (not committed)
- `.env.development` / `.env.production` – per-mode

More: https://vitejs.dev/guide/env-and-mode.html

---

## Port & host
Default: **5173**.
Change with `--port` or in `vite.config.ts`.
```powershell
npm run dev -- --port 5180
```

If you need LAN access:
```powershell
npm run dev -- --host
```

---

## Optional: Backend API proxy (dev)
If the backend runs on another port and you want to avoid CORS during development, add a proxy in `vite.config.ts`:
```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5024', // backend
        changeOrigin: true
      }
    }
  }
});
```
Now requests to `/api/...` in dev will be forwarded to the backend.

Docs: https://vitejs.dev/config/server-options.html#server-proxy

---

## VS Code: launch with debugger (optional)
Create `.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Vite dev server",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "skipFiles": ["<node_internals>/**"]
    }
  ]
}
```
Start debugging with **F5**.

---

## Common issues & fixes

### 1) `'vite' is not recognized as an internal or external command`
- Run `npm install` (creates `node_modules` with `vite` inside)
- If still broken: clean reinstall
```powershell
rd /s /q node_modules & del package-lock.json
npm install
```

### 2) Node version too old
- Ensure Node ≥ 18 (prefer 20): `node -v`
- Switch with nvm (Windows):
```powershell
nvm install 20.16.0
nvm use 20.16.0
```

### 3) Corporate/Custom registry
If you use a private registry, set it explicitly before install:
```powershell
npm config set registry https://registry.npmjs.org/
# or your corporate registry
# npm config set registry https://pkg.whitebox.ru/npm/WhiteboxNpm
npm install
```
Check active registry:
```powershell
npm config get registry
```

### 4) Port already in use
```powershell
npm run dev -- --port 5180
```

### 5) SSL / HTTPS in dev
Use `--host` and a dev proxy or self-signed certs (advanced). Most setups don’t need HTTPS in local dev.

---

## Build artifacts
- Production bundle: `/dist`
- Serve locally to test production build:
```powershell
npm run build
npm run preview
```
Preview default: http://localhost:4173/

---

## Folder structure (typical)
```
project/
├─ src/
│  ├─ assets/
│  ├─ components/
│  ├─ pages/
│  ├─ hooks/
│  ├─ styles/
│  ├─ main.tsx
│  └─ App.tsx
├─ public/
├─ index.html
├─ vite.config.ts
├─ tsconfig.json
├─ package.json
└─ README.md
```

---

## FAQ
**Q:** Can I start with `npx vite`?

**A:** Yes, but prefer `npm run dev` so you use the project’s pinned `vite` version.

**Q:** Does this require global installs?

**A:** No. Everything is local to the project (devDependencies).

---

## Useful links
- Vite docs: https://vitejs.dev/
- React docs: https://react.dev/
- TypeScript docs: https://www.typescriptlang.org/

---

## TL;DR
```powershell
npm config set registry https://registry.npmjs.org/
nvm use 20.16.0   # or install it
npm install
npm run dev
```
If it fails, clean & retry:
```powershell
rd /s /q node_modules & del package-lock.json
npm install
npm run dev
```


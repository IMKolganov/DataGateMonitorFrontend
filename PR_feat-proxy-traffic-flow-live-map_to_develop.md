# Pull request: `feat/proxy-traffic-flow-live-map` → `develop`

**Repository:** OpenVpnGateMonitorFrontend  
**Branch:** `feat/proxy-traffic-flow-live-map`  
**Base:** `develop`  
**Commits:** 34 · **~475 files** (large Orval regen + dist assets)

---

## Title

```
feat: live proxy traffic maps, admin 2FA, Telegram login, settings sidebar, v3 catalog
```

---

## Summary

Major frontend increment relative to `develop`: live OpenVPN proxy traffic visualization (per-server and global overview), operational/status-stream UX, v3 VPN server catalog, admin security (TOTP, idle session, Telegram code login, active sessions), settings layout improvements, Windows crash reports UI, and privacy-aware statistics for non-admins. API clients regenerated via **Orval** from backend OpenAPI.

### Live proxy traffic flow
- Per-server and **global servers overview** traffic maps with globe/visualization.
- Traffic routed through **backend SignalR hub** (not direct agent connection from browser).
- Gated by server version; offline playback mode on overview; diagnostics for payload parsing and IP matching.
- Multiple stabilization fixes for subscriptions, rendering, and overview API payload shapes (wrapped vs unwrapped).

### VPN servers & operations
- **v3 server catalog** UI with quota view-only notices and stack logos (OpenVPN / Xray).
- Post-create setup progress UI; preserve quota plans on server update.
- Status stream logs UI (Orval); emphasize failures in server details.
- Slow polling server indicators; server log clear action.
- Advanced cycle parallelism metrics in status logs.
- Map/table layout fixes (phantom scrollbars, overview stability).

### Admin authentication & security
- **TOTP 2FA:** login challenge step, security settings page (enroll / disable), QR setup (`qrcode`), optional password on disable for password-based admins.
- **Orval-only auth APIs:** removed hand-written `totpApi`; `orvalPayload` shim for typed `ApiResponse` unwrap.
- **Idle admin session:** session policy + activity heartbeat (`adminIdleSession.ts`).
- **Telegram code login:** form under “Continue with Telegram”; instructions for `/login_code` only; TOTP challenge after code login when required.
- **Active sessions** on security settings (list / revoke); interim `adminSessionsApi` until full Orval coverage for session endpoints.
- `RequireAdminTotpSetup` guard for admins without TOTP when policy requires it.
- Shared login flow helper: `handleLoginResponse.ts`, `tokenExpiryScheduler.ts`.

### Settings & navigation
- **Left sidebar** layout for settings (full-width content area for tables/grids).
- Routes: General, API clients, quotas, GeoLite, notifications, Telegram bot, users, email broadcast, Android/Windows crashes, admin password, **Security (2FA)**.

### Privacy & access control
- Restrict per-user statistics for non-admins.
- Gate admin UI routes; access-denied page for unauthorized resources.

### Windows crash reports
- Settings page and route for Windows crash report management.

### Tooling & build
- Orval client regeneration (large diff under `src/api/orval/`).
- `vite.config` updates; release/cache hardening; dist entrypoint refresh.
- Version bumps (e.g. 1.3.89, 1.3.90).

---

## Key paths (for reviewers)

| Area | Paths |
|------|--------|
| Traffic maps | `src/pages/ServersOverview/`, server details / proxy traffic components |
| Auth | `src/components/auth/`, `src/utils/auth/`, `src/pages/AdminSecuritySettings.tsx` |
| Settings shell | `src/pages/Settings.tsx`, `src/css/Settings.css` |
| Orval | `src/api/orval/`, `orval.config.ts`, `src/api/orvalModelShim.ts` |
| Windows crashes | settings route in `App.tsx`, dedicated settings page |

---

## Dependencies / integration

- Requires **deployed backend** with matching OpenAPI (v3 servers, auth, sessions, traffic hub, status stream).
- **SharedModels** types flow through generated Orval models + `orvalModelShim.ts` aliases.
- After backend merge: run `npm run gen:api` (or project’s Orval script) if swagger changed again.
- Telegram bot: users obtain codes via **`/login_code`** only.

---

## Commits (34, oldest → newest)

1. `1b1b87b` — feat: add Windows crash reports settings page and route  
2. `f3085f0` — feat: add live proxy traffic map and globe visualization  
3. `74cac9e` — fix: force proxy traffic flow through backend hub  
4. `16cd039` — fix: gate traffic flow stream by server version  
5. `084d8fa` — fix: improve traffic flow IP matching and bump frontend version  
6. `3ae4aed` — feat: add global live proxy traffic map for all servers  
7. `5a2afce` — fix: restore live traffic rendering on overview and server pages  
8. `87edbd3` — fix: improve live traffic map matching and refresh control  
9. `1c0d450` — fix: add detailed traffic-flow diagnostics and robust payload parsing  
10. `0de57a6` — fix: resolve single-server flow rendering and surface mapping diagnostics  
11. `e8833ff` — fix: restore global traffic subscriptions on servers overview  
12. `c6fd33c` — fix: use strict typed API response access on servers overview  
13. `7530926` — chore: refresh build artifact after overview fix  
14. `218519f` — fix: restore overview traffic subscriptions and log server list  
15. `8e3fe8c` — fix: support wrapped or unwrapped overview API payloads  
16. `49e5776` — feat: add offline playback mode for servers overview traffic map  
17. `2050074` — fix: stabilize proxy traffic map behavior on servers overview  
18. `9b6816d` — fix: stabilize servers maps and remove phantom table scrollbars  
19. `a569ef0` — fix: harden frontend release resiliency and cache policy  
20. `681195d` — feat: regenerate orval API and wire status stream logs UI  
21. `cc3f87f` — feat: emphasize status stream failures in details view  
22. `f9f98a3` — chore: refresh dist entrypoint asset references  
23. `c5105f2` — feat: surface slow polling servers and bump frontend to 1.3.89  
24. `3798e07` — feat: add server-log clear action and bump frontend to 1.3.90  
25. `be309a3` — feat: parse advanced cycle parallelism metrics in status logs  
26. `6644378` — feat: post-create setup progress UI and preserve quota plans on update  
27. `9cb18c5` — feat(ui): restrict per-user statistics access for non-admins  
28. `a59f5cc` — Gate admin UI routes and show access denied for restricted resources  
29. `e521459` — feat(web): v3 server catalog, quota view-only UX, and OpenAPI client regen  
30. `2befe25` — feat(auth): admin 2FA login challenge and security settings UI  
31. `94eb4c5` — refactor(auth): use Orval for admin TOTP and idle session APIs  
32. `72af62e` — fix(auth): TOTP QR code and optional password on 2FA disable  
33. `fa9d8f9` — feat(auth): Telegram code login, admin sessions, and settings sidebar  
34. `0cc8aeb` — fix(auth): clarify Telegram code login instructions on sign-in page  

---

## Test plan

- [ ] `npm ci` / `npm run build`  
- [ ] `npm run lint` (if used in CI)  
- [ ] Login: password, Google, Telegram code (`/login_code` from bot) + TOTP challenge when enabled  
- [ ] Security settings: TOTP enroll (QR), disable (with/without password admin), active sessions revoke  
- [ ] Idle session: stay idle past policy → forced re-auth  
- [ ] Settings: sidebar navigation on desktop; mobile dropdown; all sections load  
- [ ] Servers overview: global traffic map, offline mode, no duplicate subscriptions / memory leaks (smoke)  
- [ ] Server details: per-server traffic map, status stream logs, slow polling badge, clear logs  
- [ ] v3 catalog / quota view-only notice for restricted users  
- [ ] Non-admin: statistics masked / access denied on admin routes  
- [ ] Windows crash reports settings page (smoke)  
- [ ] `npm run gen:api` against staging swagger if backend PR merged after this branch was cut  

---

## Create PR (CLI)

```bash
cd frontend   # OpenVpnGateMonitorFrontend clone
git push -u origin feat/proxy-traffic-flow-live-map

gh pr create --base develop --head feat/proxy-traffic-flow-live-map \
  --title "feat: live proxy traffic maps, admin 2FA, Telegram login, settings sidebar, v3 catalog" \
  --body-file PR_feat-proxy-traffic-flow-live-map_to_develop.md
```

To paste into GitHub UI manually, copy from **Summary** through **Test plan** (exclude this file’s header and CLI section if you prefer a shorter description).

# Frontend Release Hardening Checklist

Use this checklist for every frontend release to avoid blank pages and chunk mismatch issues after deploy.

## Current status in this repo

- [x] `index.html` is configured with no-cache headers in nginx.
- [x] `/assets/*` hashed files are configured with long immutable cache headers in nginx.
- [x] SPA fallback (`try_files ... /index.html`) is configured.
- [x] Runtime fallback for chunk-load errors exists in `src/main.tsx`.
- [ ] Atomic deploy is guaranteed by infrastructure process.
- [ ] Old asset retention policy is documented and enforced.
- [ ] Post-release smoke checks are mandatory and documented.

## Required cache policy

- `index.html`:
  - `Cache-Control: no-cache, no-store, must-revalidate`
  - `Pragma: no-cache`
  - `Expires: 0`
- Versioned assets under `/assets/`:
  - `Cache-Control: public, max-age=31536000, immutable`

## Deployment order (must be atomic)

1. Upload new `/assets/*` first.
2. Keep previous assets available during rollout.
3. Switch/publish new `index.html` last.
4. Purge/invalidate CDN cache for `index.html` (not immutable assets).

## Verification commands

Replace `https://your-domain` with the target environment URL.

```bash
curl -I https://your-domain/index.html
curl -I https://your-domain/assets/<one-real-built-file>.js
```

Expected result:

- `index.html` returns no-cache headers.
- asset file returns immutable + long max-age.

## Post-release smoke tests

- Open app in normal browser tab (with existing cache).
- Navigate directly to a deep SPA route (refresh page there).
- Open in private/incognito tab.
- Verify header/footer and main layout render without hard refresh.
- Check browser console for chunk load errors.

## CDN and proxy notes

- Do not force-cache `index.html` on CDN.
- Respect origin no-cache for HTML shell.
- Do not rewrite missing asset requests to `index.html`; missing assets should return `404`.


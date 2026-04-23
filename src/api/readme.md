## When backend (Swagger) is updated

1. Start the API so OpenAPI is served (default: `http://127.0.0.1:5581`, Swashbuckle: `/swagger/v1/swagger.json`).
2. From the **`frontend/`** directory:

   ```bash
   rm -rf src/api/orval
   npm run gen:api
   ```

   Remove `src/api/orval` first so Orval does not leave stale generated files next to new output (especially with `tags-split`).

   **`orval.config.ts`** loads the spec over HTTP from that URL. To use another host/port:

   ```bash
   OPENAPI_URL=http://host.docker.internal:5581/swagger/v1/swagger.json npm run gen:api
   ```

3. If TypeScript complains inside `src/api/orval/**`, it is usually Orval’s response unions vs `ogmMutator` unwrapping — fix at call sites or adjust the mutator; do not hand-edit generated files.

**Offline / CI:** point `OPENAPI_URL` at a `file://` URL or a checked-in copy (e.g. export `GET /swaggerjson` or `/swagger/v1/swagger.json` into `backend/Schems/swagger.json` and temporarily set `input` to that path in `orval.config.ts` if you must generate without a live server).

## When backend (Swagger) is updated

Orval talks to a **running** API. Do not hand-patch `openapi/swagger.json` and generate from the file — start the backend and pull live Swashbuckle.

1. Start the API so OpenAPI is served (default: `http://127.0.0.1:5581`, Swashbuckle: `/swagger/v1/swagger.json`).
2. From the **`frontend/`** directory:

   ```bash
   rm -rf src/api/orval
   npm run gen:api
   ```

   Remove `src/api/orval` first so Orval does not leave stale generated files next to new output (especially with `tags-split`).

   **`orval.config.ts`** defaults to that live URL. Another host/port:

   ```bash
   OPENAPI_URL=http://host.docker.internal:5581/swagger/v1/swagger.json npm run gen:api
   ```

3. Optionally refresh the committed snapshot used only for offline/CI:

   ```bash
   curl -fsS http://127.0.0.1:5581/swagger/v1/swagger.json -o openapi/swagger.json
   ```

4. If TypeScript complains inside `src/api/orval/**`, it is usually Orval’s response unions vs `ogmMutator` unwrapping — fix at call sites or adjust the mutator; do not hand-edit generated files.

**Offline / CI:** `npm run gen:api:offline` reads `frontend/openapi/swagger.json` (keep it in sync with a live export, step 3). Do not treat the file as the source of truth.

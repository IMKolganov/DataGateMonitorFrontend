## When backend (Swagger) is updated

1. Start the API so Swagger is available (default in this project: `http://localhost:5581`).
2. From the repo root:

   ```bash
   npm run gen:api
   ```

   Orval reads **`http://localhost:5581/swagger/v1/swagger.yaml`** (see `orval.config.ts`) — you always get the spec from the **running** instance, same as before.

3. If TypeScript complains inside `src/api/orval/**`, it is usually Orval’s response unions vs `ogmMutator` unwrapping — fix at call sites or adjust the mutator; do not hand-edit generated files.

**Optional:** to pin a spec for CI without a running server, save a copy and temporarily point `input` in `orval.config.ts` to that file (or use `curl -o /tmp/spec.json http://localhost:5581/swagger/v1/swagger.json` and compare). The backend repo’s `Schems/swagger.yaml` may lag behind the live app until someone exports it from a running build.

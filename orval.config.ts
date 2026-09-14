/**
 * Orval fetches OpenAPI from a running backend (Swashbuckle).
 * Default: local API at http://127.0.0.1:5581/swagger/v1/swagger.json
 *
 * Override: OPENAPI_URL=http://host:port/swagger/v1/swagger.json
 * Offline/CI: OPENAPI_URL=./openapi/swagger.json (or any filesystem path)
 */
import path from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_LIVE_SWAGGER = "http://127.0.0.1:5581/swagger/v1/swagger.json";

function resolveOpenApiInput(): string {
  const raw = process.env.OPENAPI_URL ?? DEFAULT_LIVE_SWAGGER;
  if (/^https?:\/\//i.test(raw) || raw.startsWith("file:")) return raw;
  return path.resolve(path.dirname(fileURLToPath(import.meta.url)), raw);
}

const openApiUrl = resolveOpenApiInput();

export default {
  ogm: {
    input: openApiUrl,

    // Where to put generated files
    output: {
      target: "src/api/orval/client.ts", // single-file client
      schemas: "src/api/orval/model", // types/models directory
      client: "react-query", // or 'fetch' if you don't want hooks
      // Use axios-shaped responses with a custom mutator (fetch default adds status/headers to every T)
      httpClient: "axios",
      mode: "tags-split", // split by tags -> 1 file per controller (nice for big APIs)
      prettier: true,
      override: {
        // Use your own HTTP layer
        mutator: {
          path: "src/api/mutator.ts",
          name: "ogmMutator",
        },
      },
    },
  },
};

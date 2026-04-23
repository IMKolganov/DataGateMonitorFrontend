/**
 * Orval input: `backend/Schems/swagger.json` (OpenAPI 3 JSON).
 * Regenerate: save `GET /swaggerjson` from a running backend, then merge any paths/schemas
 * that exist only in `swagger.yaml` (e.g. newer endpoints not yet deployed).
 */
export default {
  ogm: {
    input: "../backend/Schems/swagger.json",

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

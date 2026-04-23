/**
 * Orval fetches OpenAPI from a running backend (Swashbuckle).
 * Override with env: `OPENAPI_URL=https://host:port/swagger/v1/swagger.json`
 */
const openApiUrl =
  process.env.OPENAPI_URL ?? "http://127.0.0.1:5581/swagger/v1/swagger.json";

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

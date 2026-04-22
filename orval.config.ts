/**
 * OpenAPI input: committed spec in monorepo (`../backend/Schems/swagger.yaml`).
 * To regenerate from a running API instead, temporarily set `input` to
 * `http://localhost:5581/swagger/v1/swagger.yaml` and run `npm run gen:api`.
 */
export default {
  ogm: {
    input: "../backend/Schems/swagger.yaml",

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

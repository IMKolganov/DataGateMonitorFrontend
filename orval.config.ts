export default {
  ogm: {
    // Your OpenAPI YAML
    input: 'http://localhost:5581/swagger/v1/swagger.yaml',

    // Where to put generated files
    output: {
      target: 'src/api/orval/client.ts',      // single-file client
      schemas: 'src/api/orval/model',         // types/models directory
      client: 'react-query',                  // or 'fetch' if you don't want hooks
      mode: 'tags-split',                     // split by tags -> 1 file per controller (nice for big APIs)
      prettier: true,
      override: {
        // Use your own HTTP layer
        mutator: {
          path: 'src/api/mutator.ts',
          name: 'ogmMutator',
        },
      },
    },
  },
};

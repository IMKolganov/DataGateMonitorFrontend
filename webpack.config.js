const { ESBuildMinifyPlugin } = require('esbuild-loader');

module.exports = {
  module: {
    rules: [
      {
        test: /\.(js|jsx|ts|tsx)$/,
        use: [
          'thread-loader',
          {
            loader: 'esbuild-loader',
            options: {
              loader: 'tsx',
              target: 'es2015'
            }
          }
        ]
      }
    ]
  },
  optimization: {
    minimize: true,
    minimizer: [
      new ESBuildMinifyPlugin({
        target: 'es2015'
      })
    ]
  },
  devServer: {
    client: {
      webSocketURL: false
    }
  }
};

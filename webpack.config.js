const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
  mode: "production",
  entry: {
    common: './src/static/js/scripts/common_base.js',
  },
  output: {
    filename: 'static/js/[name].bundle.js',
    chunkFilename: 'static/js/[name].bundle.js',
    path: path.resolve(__dirname, 'public/'),
  },
  plugins: [
    new CopyPlugin([
      { from: '*', context: "src/"},
      { from: 'static/*', context: "src/"},
      { from: 'static/css/*', context: "src/"},
      { from: 'static/js/*', context: "src/"},
    ]),
  ],
  module: {
    rules: [
      {
        test: /\.css$/i,
        use: ['style-loader', 'css-loader'],
      },
    ],
  },
};

const webpack = require('webpack');
const path = require('path');

module.exports = {
  target: 'node',
  entry: './src/index.ts',
  resolve: {
    extensions: ['.ts', '...'],
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        exclude: /node_modules/,
      },
    ],
  },
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'bundle.js',
    clean: true,
  },
  externals: {
    dotenv: 'commonjs dotenv',
    koa: 'commonjs koa',
    'koa-bodyparser': 'commonjs koa-bodyparser',
    'koa-router': 'commonjs koa-router',
    md5: 'commonjs md5',
    sqlite3: 'commonjs sqlite3',
    tripcode: 'commonjs tripcode',
  },
  plugins: [new webpack.ProgressPlugin()],
};

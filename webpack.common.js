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
    ffprobe: 'commonjs ffprobe',
    koa: 'commonjs koa',
    'koa-bodyparser': 'commonjs koa-bodyparser',
    'koa-router': 'commonjs koa-router',
    '@koa/multer': 'commonjs @koa/multer',
    'koa-helmet': 'commonjs koa-helmet',
    'koa-conditional-get': 'commonjs koa-conditional-get',
    'koa-etag': 'commonjs koa-etag',
    'koa-static': 'commonjs koa-static',
    md5: 'commonjs md5',
    'md5-file': 'commonjs md5-file',
    sqlite3: 'commonjs sqlite3',
    tripcode: 'commonjs tripcode',
  },
  plugins: [],
};

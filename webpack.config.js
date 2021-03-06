var path = require('path');
var webpack = require('webpack');

// workaround older versions of node (i.e. those in the Ubuntu PPA)
require('es6-promise').polyfill()

var bootstrapPath = path.join(__dirname, 'node_modules/bootstrap/dist/css');

module.exports = {
  devtool: 'source-map',
  entry: {
    terrarium: "./src/terrarium.js",
    editor: "./src/editor.js",
  },
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '/assets/',
    filename: '[name].bundle.js'
  },
  resolve: {
    modules: ['node_modules', bootstrapPath],
  },
  module: {
    rules: [
      { test: /\.js$/, loader: 'babel-loader', query: { presets: ['@babel/env', '@babel/preset-react'] }, exclude: /node_modules/ },
      { test: /\.js$/, loader: 'eslint-loader', exclude: /node_modules/ },
      { test: /\.css$/, loader: 'style-loader!css-loader' },
      { test: /\.eot(\?v=\d+\.\d+\.\d+)?$/, loader: 'file-loader' },
      {
        test: /\.glsl$/,
        exclude: /node_modules/,
        use: [
          'raw-loader',
          'glslify-loader'
        ]
      },
      { test: /\.(woff|woff2)$/, loader: 'url-loader?prefix=font/&limit=5000' },
      { test: /\.ttf(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=application/octet-stream' },
      { test: /\.svg(\?v=\d+\.\d+\.\d+)?$/, loader: 'url-loader?limit=10000&mimetype=image/svg+xml' },
    ]
  },
  plugins: [
    //new webpack.optimize.UglifyJsPlugin(),
  ],
};

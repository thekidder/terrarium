var path = require('path');
var webpack = require('webpack');

// workaround older versions of node (i.e. those in the Ubuntu PPA)
require('es6-promise').polyfill()

module.exports = {
  devtool: 'source-map',
  entry: './src/app.js',
  output: {
    path: path.resolve(__dirname, 'build'),
    publicPath: '/assets/',
    filename: 'bundle.js'
  },
  module: {
    loaders: [
      { test: /\.js$/, loader: 'babel?presets[]=es2015', exclude: /node_modules/ },
      { test: /\.js$/, loader: 'eslint-loader', exclude: /node_modules/ }
    ]
  }
};

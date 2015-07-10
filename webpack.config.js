/**
 * Created by keith on 13/02/15.
 */
var webpack = require('webpack');
var util = require('util');
var path = require('path');
var fs = require('fs');
var ExtractTextPlugin = require('extract-text-webpack-plugin');

var pkg = require('./package.json');
var port = pkg.config.devPort,
    host = pkg.config.devHost;

var DEBUG = process.env.NODE_ENV === 'development';
var TEST = process.env.NODE_ENV === 'test';
var jsBundle = path.join('js', util.format('[name].%s.js', pkg.version));
var cssBundle = path.join('css', util.format('[name].%s.css', pkg.version));

var entry = {
  app: ['./app.jsx']
};
if (DEBUG) {
  entry.app.push(
    util.format('webpack-dev-server/client?http://%s:%d', host, port));
  entry.app.push('webpack/hot/dev-server');
}

var plugins = [
  new ExtractTextPlugin(cssBundle, {
    allChunks: true
  }),
  new webpack.optimize.OccurenceOrderPlugin()
];

var jsxLoader = ['react-hot', 'babel-loader?optional=runtime'];
if (DEBUG) {
  jsxLoader.unshift('react-hot');
  plugins.push(
    new webpack.HotModuleReplacementPlugin()
  );
} else if (!TEST) {
  plugins.push(
    new webpack.optimize.UglifyJsPlugin(),
    new webpack.optimize.DedupePlugin()
  );
}


var sassParams = [
  'outputStyle=expanded',
  'includePaths[]=' + path.resolve(__dirname, '../app/scss'),
  'includePaths[]=' + path.resolve(__dirname, '../node_modules')
];

var cssLoader = ExtractTextPlugin.extract('style-loader',[
    'css-loader',
    'postcss-loader'
  ].join('!'));
var sassLoader = ExtractTextPlugin.extract('style-loader', [
    'css-loader',
    'postcss-loader',
    'sass-loader?' + sassParams.join('&')
  ].join('!'));
var fileLoader = 'file-loader?name=[path][name].[ext]';
var forceCreds = fs.readFileSync(process.env.HOME +"/.force/accounts/khowling@oneview.ul", "utf8").match(/\"AccessToken\":\"([^\!]+)!([^\"]+)/);
console.log ('accesstoken : ' + forceCreds[1] + '!' + forceCreds[2]);
var htmlLoader = fileLoader + '!' +
  'template-html-loader?' + [
    'raw=true',
    'engine=lodash',
    'version=' + pkg.version,
    'title=' + pkg.name,
    'debug=' + DEBUG,
    'AccessToken1="' + forceCreds[1] + '"',
    'AccessToken2="' + forceCreds[2] + '"'
  ].join('&')




var config = {
    context: path.join(__dirname, 'app'),
    /* Switch loaders to debug mode. */
    debug: DEBUG,
    cache: DEBUG,
    target: 'web',
    /* Choose a developer tool to enhance debugging */
    devtool: DEBUG || TEST ? 'inline-source-map' : false,
    entry: entry,
    output: {
        path: path.resolve(pkg.config.buildDir),
        filename: jsBundle,
        publicPath: '/',
        pathinfo: false
    },
    plugins: plugins,
    module: {
        loaders: [
            {
              test: /\.jsx$|\.es6$/,
              exclude: /node_modules/,
              loaders: jsxLoader
            },
            {
              test: /\.css$/,
              loader: cssLoader
            },
            {
              test: /\.jpe?g$|\.gif$|\.png$|\.ico|\.svg$|\.woff$|\.woff2$|\.ttf$/,
              loader: fileLoader
            },
            {
              test: /\.html$/,
              loader: htmlLoader
            },
            {
               test: /\.scss$/,
               loader: sassLoader
            }
        ]
    },
    devServer: {
      contentBase: path.resolve(pkg.config.buildDir),
      hot: true,
      noInfo: false,
      inline: true,
      stats: { colors: true }
    }
};

module.exports = config;

var os = require('os');
var path = require('path');
var gulp = require('gulp');
var gutil = require("gulp-util");
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var gulpif = require('gulp-if');
var zip = require ("gulp-zip");
var replace = require('gulp-replace');
var headerfooter = require('gulp-headerfooter');
var exec = require('child_process').exec;
var webpack = require("webpack");
var WebpackDevServer = require("webpack-dev-server");
var webpackConfig = require("./webpack.config.js");



gulp.task("webpack:build", function(callback) {
    // modify some webpack config options
    var myConfig = Object.create(webpackConfig);
    myConfig.debug = false;
    myConfig.devtool = null;
    myConfig.entry = myConfig.entry[2];
    myConfig.plugins = [
        new webpack.DefinePlugin({
            "process.env": {
                // This has effect on the react lib size
                "NODE_ENV": JSON.stringify("production")
            }
        }),
        new webpack.optimize.DedupePlugin(),
        new webpack.optimize.UglifyJsPlugin({
            mangle: {
                except: ['GeneratorFunction', 'GeneratorFunctionPrototype']
            }
        }),
        new webpack.optimize.OccurenceOrderPlugin()
    ];

    // run webpack
    webpack(myConfig, function(err, stats) {
        if(err) throw new gutil.PluginError("webpack:build", err);
        gutil.log("[webpack:build]", stats.toString({
            colors: true
        }));
        callback();
    });
});

function string_src(filename, string) {
    var src = require('stream').Readable({ objectMode: true })
    src._read = function () {
        this.push(new gutil.File({ cwd: "", base: "", path: filename, contents: new Buffer(string) }))
        this.push(null)
    }
    return src
}

gulp.task ("package:meta", function() {
    return string_src("package.xml",
        '<?xml version="1.0" encoding="UTF-8"?>\n'+
        '<Package xmlns="http://soap.sforce.com/2006/04/metadata">\n'+
        '    <types>\n'+
        '       <members>*</members>\n'+
        '       <name>ApexPage</name>\n'+
        '   </types>\n'+
        '   <types>\n'+
        '       <members>*</members>\n'+
        '       <name>StaticResource</name>\n'+
        '   </types>\n'+
        '   <version>33.0</version>\n'+
        '</Package>')
        .pipe(gulp.dest('./metadata'))
});

var statictasks = [];
[
    {name: "Bower", src: 'bower_components/**/*'},
    {name: "App", src: ['static/css/*', 'static/output/*', 'static/images/*']}
].forEach(function(sr) {
    statictasks.push(sr.name + ":res");
    gulp.task (sr.name + ":res", ["webpack:build"], function() {
        return gulp.src(sr.src)
            .pipe(zip(sr.name+".resource"))
            .pipe(gulp.dest ('./metadata/staticresources'));
    });
    statictasks.push(sr.name + ":meta");
    gulp.task (sr.name + ":meta", function() {
        return string_src(sr.name+".resource-meta.xml",
            '<?xml version="1.0" encoding="UTF-8"?>\n'+
            '<StaticResource xmlns="http://soap.sforce.com/2006/04/metadata">\n'+
            '    <cacheControl>Public</cacheControl>\n'+
            '    <contentType>application/x-zip-compressed</contentType>\n'+
            '</StaticResource>\n')
            .pipe(gulp.dest('./metadata/staticresources'))
    });
});

var page = {name: "myreact1", src: "index.html", dest: "./metadata/pages"};

gulp.task ("page:meta", function() {
    return string_src(page.name+".page-meta.xml",
        '<?xml version="1.0" encoding="UTF-8"?>\n'+
        '<ApexPage xmlns="http://soap.sforce.com/2006/04/metadata">\n'+
        '    <apiVersion>32.0</apiVersion>\n'+
        '    <availableInTouch>true</availableInTouch>\n'+
        '    <confirmationTokenRequired>false</confirmationTokenRequired>\n'+
        '    <label>'+page.name+'</label>\n'+
        '</ApexPage>')
        .pipe(gulp.dest(page.dest))
});

gulp.task ("page:vf", function() {
    return gulp.src([page.src])
        .pipe(replace(/(href|src)="\/bower_components\/([^"]*)\"/g, '$1=\"{!URLFOR($Resource.Bower, \'$2\')}\"'))
        .pipe(replace(/(href|src)="\/output\/([^"]*)\"/g, '$1=\"{!URLFOR($Resource.App, \'$2\')}\"'))
        .pipe(rename(page.name+".page"))
        .pipe(gulp.dest (page.dest));
});

gulp.task('webpack:force', function() {
  exec('NODE_ENV=production npm run webpack', function (err, stdout, stderr) {
      console.log(stdout);
      console.log(stderr);
  });
});

gulp.task('force:import', ["webpack:force", "package:meta", "page:meta", "page:vf"].concat(statictasks), function () {
    exec('force import', function (err, stdout, stderr) {
        console.log(stdout);
        console.log(stderr);
    });
})

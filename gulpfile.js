var os = require('os');
var path = require('path');
var gulp = require('gulp');
var gutil = require("gulp-util");
var babel = require('gulp-babel');
var rename = require('gulp-rename');
var gulpif = require('gulp-if');
var zip = require ("gulp-zip");
var replace = require('gulp-replace');
var exec = require('child_process').exec;


var pkg = require('./package.json');
var buildDir = pkg.config.buildDir,
    pageName = pkg.name + (pkg.version.replace(new RegExp('\\.', 'g'), ''));

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
    {name: pageName, src: [buildDir+'/**/*']}
].forEach(function(sr) {
    statictasks.push(sr.name + ":res");
    gulp.task (sr.name + ":res", ["webpack:visualforce"], function() {
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

gulp.task ("page:meta", function() {
    return string_src(pageName+".page-meta.xml",
        '<?xml version="1.0" encoding="UTF-8"?>\n'+
        '<ApexPage xmlns="http://soap.sforce.com/2006/04/metadata">\n'+
        '    <apiVersion>32.0</apiVersion>\n'+
        '    <availableInTouch>true</availableInTouch>\n'+
        '    <confirmationTokenRequired>false</confirmationTokenRequired>\n'+
        '    <label>'+pageName+'</label>\n'+
        '</ApexPage>')
        .pipe(gulp.dest("./metadata/pages"))
});

gulp.task ("page:vf", ["webpack:visualforce"], function() {
    return gulp.src([buildDir+"/index.html"])
        .pipe(replace(/(href|src)="bower_components\/([^"]*)\"/g, '$1=\"{!URLFOR($Resource.Bower, \'$2\')}\"'))
        .pipe(replace(/(href|src)="((js|css)\/[^"]*)\"/g, '$1=\"{!URLFOR($Resource.'+pageName+', \'$2\')}\"'))
        .pipe(rename(pageName+".page"))
        .pipe(gulp.dest ("./metadata/pages"));
});

gulp.task('webpack:visualforce', function(cb) {
  return exec('npm run webpack', {shell: process.env.SHELL, env: {PATH: process.env.PATH, HOME: process.env.HOME, NODE_ENV:"test", BUILD_TARGET: "visualforce"}}, function (err, stdout, stderr) {
      if (stdout) console.log('out : ' + stdout);
      if (stderr) console.log('err : ' +stderr);
      cb(err);
  });
});

gulp.task('force:import', ["webpack:visualforce", "package:meta", "page:meta", "page:vf"].concat(statictasks), function () {
    exec('force import', function (err, stdout, stderr) {
      if (stdout) console.log('out : ' + stdout);
      if (stderr) console.log('err : ' +stderr);
    });
})

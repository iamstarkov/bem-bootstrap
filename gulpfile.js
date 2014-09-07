'use strict';
var gulp = require('gulp');
var join = require('path').join;
var basename = require('path').basename;
var dirname = require('path').dirname;
var through = require('through2');
var sequence = require('run-sequence');
var less = require('gulp-less');

var prefix = 'node_modules/bootstrap/less'

var destInLevel = function(folder) {
  return through.obj(function(file, enc, cb) {
    var blockName = basename(file.path, '.less');

    gulp.src([file.path])
      .pipe(gulp.dest(join(folder, blockName)))
      .on('end', cb);
  });
}

var compile = function(folder) {
  return through.obj(function(file, enc, cb) {
    gulp.src(file.path)
      .pipe(less())
      .pipe(gulp.dest(dirname(file.path)))
      .on('end', cb);

      return cb();
    });
}

gulp.task('copy-less', function(cb) {
  sequence(['copy-variables'], cb)
});

gulp.task('copy-variables', function() {
  return gulp.src([join(prefix, 'variables.less')]).pipe(destInLevel('core'));
});

gulp.task('copy-docs', function(cb) {
  sequence(['copy-docs-yamlconfig', 'copy-docs-site'], cb);
});

gulp.task('copy-docs-yamlconfig', function() {
  return gulp.src('./node_modules/bootstrap/_config.yml').pipe(gulp.dest('./'));
});

gulp.task('copy-docs-site', function() {
  return gulp.src('./node_modules/bootstrap/docs/**').pipe(gulp.dest('./docs/'));
});

gulp.task('compile-blocks', function() {
  return gulp.src(['core/*/*.less']).pipe(compile());
});

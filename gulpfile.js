'use strict';
var gulp = require('gulp');
var join = require('path').join;
var sequence = require('run-sequence');

var prefix = 'node_modules/bootstrap/less'

gulp.task('copy-less', function(cb) {
  sequence(['copy-variables'], cb)
});

gulp.task('copy-variables', function() {
  return gulp.src([join(prefix, 'variables.less')]).pipe(gulp.dest('./core/variables/'));
});

gulp.task('copy-docs-yamlconfig', function() {
  return gulp.src('./node_modules/bootstrap/_config.yml').pipe(gulp.dest('./'));
});

gulp.task('copy-docs-site', function() {
  return gulp.src('./node_modules/bootstrap/docs/**').pipe(gulp.dest('./docs/'));
});

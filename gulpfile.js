'use strict';
var gulp = require('gulp');
var join = require('path').join;
var basename = require('path').basename;
var dirname = require('path').dirname;
var through = require('through2');
var sequence = require('run-sequence');
var less = require('gulp-less');

var levels = ['settings', 'reset'];

/**
 * Copy all the stuff
 */
gulp.task('copy-less', function(cb) {
  sequence(['copy-settings', 'copy-reset'], 'compile-blocks', cb)
});

/**
 * Compiling blocks
 */
gulp.task('compile-blocks', function() {
  var postfix = function(item) { return join(item, '*/*.less'); }
  return gulp.src(levels.map(postfix)).pipe(compile());
});


/**
 * # Settings section
 */
gulp.task('copy-settings', function(cb) {
  sequence(['copy-settings-blocks', 'copy-mixins'], cb)
});

gulp.task('copy-settings-blocks', function() {
  return gulp.src(['variables.less', 'mixins.less'].map(prefix)).pipe(destInLevel('settings'));
});

gulp.task('copy-mixins', function() {
  return gulp.src(['mixins/**.less'].map(prefix)).pipe(gulp.dest('settings/mixins/mixins'));
});


/**
 * # Reset section
 */
gulp.task('copy-reset', function(cb) {
  return gulp.src(['normalize.less', 'print.less'].map(prefix)).pipe(destInLevel('reset'));
});


/**
 * Docs
 */
gulp.task('copy-docs', function(cb) {
  sequence(['copy-docs-yamlconfig', 'copy-docs-site'], cb);
});

gulp.task('copy-docs-yamlconfig', function() {
  return gulp.src('./node_modules/bootstrap/_config.yml').pipe(gulp.dest('./'));
});

gulp.task('copy-docs-site', function() {
  return gulp.src('./node_modules/bootstrap/docs/**').pipe(gulp.dest('./docs/'));
});


/**
 * Helpers
 */
var prefix = function(item) {
  return join('node_modules/bootstrap/less', item);
};

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

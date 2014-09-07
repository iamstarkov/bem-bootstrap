'use strict';
var gulp = require('gulp');
var join = require('path').join;
var basename = require('path').basename;
var dirname = require('path').dirname;
var through = require('through2');
var sequence = require('run-sequence');
var less = require('gulp-less');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var del = require('del');

var levels = ['settings', 'reset', 'glyphicons'];

/**
 * Clean all
 */

gulp.task('clean', function(cb) {
  del(levels.concat('fonts', 'docs', '_config.yml'), cb);
});

/**
 * Copy all the stuff
 */
gulp.task('copy', function(cb) {
  sequence('clean', ['copy-less', 'copy-docs'], cb);
});

/**
 * Copy blocks
 */
gulp.task('copy-less', function(cb) {
  var copyTasks = [
    'copy-settings',
    'copy-reset',
    'copy-glyphicons'
  ];
  sequence(copyTasks, 'compile-blocks', cb);
});

/**
 * Compiling blocks
 */
gulp.task('compile-blocks', function() {
  var postfix = function(item) { return join(item, '*/*.less'); };
  return gulp.src(levels.slice(1).map(postfix)).pipe(compile());
});

/**
 * # Settings section
 */
gulp.task('copy-settings', function(cb) {
  sequence(['copy-settings-blocks', 'copy-mixins', 'copy-fonts'], cb);
});

gulp.task('copy-settings-blocks', function() {
  return gulp.src(['variables.less', 'mixins.less'].map(prefix))
    .pipe(replace('../fonts', '../../fonts'))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('settings'));
});

gulp.task('copy-mixins', function() {
  return gulp.src(['mixins/**.less'].map(prefix)).pipe(gulp.dest('settings/mixins/mixins'));
});

gulp.task('copy-fonts', function() {
  return gulp.src(['node_modules/bootstrap/fonts/**']).pipe(gulp.dest('fonts'));
});

/**
 * # Reset section
 */
gulp.task('copy-reset', function() {
  return gulp.src(['normalize.less', 'print.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('reset'));
});

/**
 * # Glyph section
 */
gulp.task('copy-glyphicons', function() {
  return gulp.src(['glyphicons.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('glyphicons'));
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

var compile = function() {
  return through.obj(function(file, enc, cb) {
    gulp.src(file.path)
      .pipe(importSettings())
      .pipe(less())
      .pipe(gulp.dest(dirname(file.path)))
      .on('end', cb);
  });
};

var prependFilename = function(path) { path.dirname += '/' + path.basename; };

var importSettings = function() {
  return through.obj(function(file, enc, cb) {
    var contents = file.contents.toString('utf8');
    var prefix = [
      '// Core variables and mixins',
      '@import "../../settings/variables/variables.less";',
      '@import "../../settings/mixins/mixins.less";'
    ].join('\n');

    file.contents = new Buffer(prefix + '\n\n' + contents);

    this.push(file);
    return cb();
  });
};

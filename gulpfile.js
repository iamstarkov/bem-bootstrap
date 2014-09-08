'use strict';
var gulp = require('gulp');
var join = require('path').join;
var sequence = require('run-sequence');
var less = require('gulp-less');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var header = require('gulp-header');
var del = require('del');

var levels = [
  'variables',
  'mixins',
  'normalize',
  'print',
  'glyphicons'
];

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
  var levelTasks = [
    'copy-variables',
    'copy-mixins',
    'copy-normalize',
    'copy-print',
    'copy-glyphicons'
  ];
  sequence('copy-fonts', levelTasks, 'compile-blocks', cb);
});

/**
 * Compiling blocks
 */
gulp.task('compile-blocks', function() {
  var postfix = function(item) { return join(item, '*/*.less'); };
  return gulp.src(levels.slice(1).map(postfix), { base: process.cwd() })
    .pipe(header([
      '@import "../../variables/variables/variables.less";',
      '@import "../../mixins/mixins/mixins.less";'
    ].join('\n')))
    .pipe(less())
    .pipe(gulp.dest('.'));
});

gulp.task('copy-fonts', function() {
  return gulp.src(['node_modules/bootstrap/fonts/**']).pipe(gulp.dest('fonts'));
});

/**
 * Variables level
 */
gulp.task('copy-variables', function() {
  return gulp.src(['variables.less'].map(prefix))
    .pipe(replace('../fonts', '../../fonts'))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('variables'));
});

/**
 * Mixins level
 */
gulp.task('copy-mixins', ['copy-mixins-itself'], function() {
    return gulp.src(['mixins.less'].map(prefix))
      .pipe(rename(prependFilename))
      .pipe(gulp.dest('mixins'));
});

gulp.task('copy-mixins-itself', function() {
  return gulp.src(['mixins/**.less'].map(prefix)).pipe(gulp.dest('mixins/mixins/mixins'));
});

/**
 * normalize level
 */
gulp.task('copy-normalize', function() {
  return gulp.src(['normalize.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('normalize'));
});

/**
 * Print level
 */
gulp.task('copy-print', function() {
  return gulp.src(['print.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('print'));
});

/**
 * Glyph level
 */
gulp.task('copy-glyphicons', function() {
  return gulp.src(['glyphicons.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(replace(/.glyphicon-/g, '.glyphicon_item_'))
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
var prefix = function(item) { return join('node_modules/bootstrap/less', item); };
var prependFilename = function(path) { path.dirname += '/' + path.basename; };

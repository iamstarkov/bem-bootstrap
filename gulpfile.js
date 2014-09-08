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
  'glyphicons',
  'core-css'
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
    'copy-glyphicons',
    'copy-core-css'
  ];
  sequence('copy-fonts', levelTasks, 'compile-blocks', cb);
});

/**
 * Compiling blocks
 */
gulp.task('compile-blocks', function() {
  var postfix = function(item) { return join(item, '*/*.less'); };
  return gulp.src(levels.slice(2).map(postfix), { base: process.cwd() })
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
  return gulp.src(['mixins/**.less'].map(prefix))
    // grid
    .pipe(replace(/\.col-(xs|sm|md|lg)-@{index}/g, '.grid__cell-$1_size_@{index}'))
    .pipe(replace(/\.col-@{class}-@{index}/g, '.grid__cell-@{class}_size_@{index}'))
    .pipe(replace(/\.col-@{class}-(push|pull|offset)-@{index}/g, '.grid__cell-@{class}_$1_@{index}'))
    .pipe(replace(/\.col-@{class}-(push|pull)-0/g, '.grid__cell-@{class}_$1_0'))
    .pipe(gulp.dest('mixins/mixins/mixins'));
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
 * Core CSS level
 *
 * // Core CSS
 * @import "scaffolding.less";
 * @import "type.less";
 * @import "code.less";
 * @import "grid.less";
 * @import "tables.less";
 * @import "forms.less";
 * @import "buttons.less";
 */
gulp.task('copy-core-css', function(cb) {
  sequence('copy-grid', 'copy-buttons', cb);
});

gulp.task('copy-grid', function() {
  return gulp.src(['grid.less'].map(prefix))
    // grid
    .pipe(replace(/\.container {/g, '.grid {'))
    // _fluid
    .pipe(replace(/\.container-fluid/g, '.grid_fluid_true'))
    // __row
    .pipe(replace(/\.row/g, '.grid__row'))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('core-css'));
});

gulp.task('copy-buttons', function() {
  return gulp.src(['buttons.less'].map(prefix))
    // _state
    .pipe(replace(/\&\.(active|disabled)/g, '&.btn_state_$1'))
    // _size
    .pipe(replace(/\.btn-(lg|sm|xs)/g, '.btn_size_$1'))
    // _theme
    .pipe(replace(/\.btn-(default|primary|success|info|warning|danger)/g, '.btn_theme_$1'))
    // _link_true
    .pipe(replace(/\.btn-link/g, '.btn_link_true'))
    // _block_true
    .pipe(replace(/\.btn-block/g, '.btn_block_true'))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('core-css'));
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

'use strict';
var gulp = require('gulp');

gulp.task('copy-less', function() {
  return gulp.src('./node_modules/bootstrap/less/**').pipe(gulp.dest('./twbs-less/'));
});

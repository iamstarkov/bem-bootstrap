'use strict';

var gulp = require('gulp');
var shell = require('shelljs');
var pff = require('pff');

/**
 * Versioning
 *
 * 1. Bump version with compulsory choice from major, minor and patch (default)
 * 2. NEXT TIME: Update changelog with optional manual editing
 * 3. Version update commit + tagging
 * 4. Optional push to remote repo
 */

var bump = require('gulp-bump');
var inquirer = require('inquirer');
var getVersion = function() { return require('./../package.json').version; };

var answers;

gulp.task('questions', function(done) {
  var questions = [
    {
      type: 'list',
      name: 'versionType',
      message: 'What version type do you need?',
      choices: [ 'Major', 'Minor', 'Patch' ],
      default: 'Patch',
      filter: function(val) { return val.toLowerCase(); }
    },
    {
      type: 'confirm',
      name: 'toBePushed',
      message: 'Is it for pushing to remote repository?',
      default: true
    }
  ];

  inquirer.prompt(questions, function(ans) {
    answers = ans;
    done();
  });
});

gulp.task('bump', ['questions'], function() {
  console.log('answers');
  console.log(answers);
  return gulp.src(['./package.json', './bower.json'])
    .pipe(bump({ type: answers.versionType }))
    .pipe(gulp.dest('./'));
});

gulp.task('git', ['bump'], function(done) {
  shell.exec('git add package.json bower.json');
  shell.exec('git ci -n -m ' + pff('"Release version v%s"', getVersion()));
  shell.exec('git tag v' + getVersion());
  if (answers.toBePushed) {
    shell.exec('git push origin master --tags');
    console.log('Version updated to v' + getVersion());
  }
  done();
});

gulp.task('version', ['git']);

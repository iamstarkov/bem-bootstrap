'use strict';

var gulp = require('gulp');
var shell = require('shelljs');
var pff = require('pff');
var bump = require('gulp-bump');
var inquirer = require('inquirer');
var getVersion = function() { return require('./../package.json').version; };

var changelog = require('conventional-changelog');
var fs = require('fs');

/**
 * Versioning
 *
 * 1. Bump version with compulsory choice from major, minor and patch (default)
 * 2. NEXT TIME: Update changelog with optional manual editing
 * 3. Version update commit + tagging
 * 4. Optional push to remote repo
 */

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

gulp.task('changelog', function(done) {
  var info = require('./../package.json');
  var filename = 'CHANGELOG.md';
  changelog({
    repository: info.repository.url,

    // from: '1d2c8ef',
    // to: '9fef1e8',
    // version: 'v0.1.0',

    // from: '9fef1e8',
    // to: 'a5d919d',
    // version: 'v0.1.1',

    from: 'a5d919d',
    to: '4408a64',
    version: 'v0.1.2',

    // from: '4408a64',
    // to: 80d51d7',
    // version: 'v0.1.3'

  }, function(err, log) {
    if (err) throw err;

    fs.appendFile(filename, { encoding: 'utf8' }, function(err, prevLog) {
      if (err) throw err;
      prevLog = prevLog || '';

      fs.writeFile(filename, log + prevLog, function(err) {
        if (err) throw err;

        done();
      });
    });
  });
});

gulp.task('version', ['git']);

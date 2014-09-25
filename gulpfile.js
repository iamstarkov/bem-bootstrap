'use strict';
var gulp = require('gulp');
var join = require('path').join;
var sequence = require('run-sequence');
var less = require('gulp-less');
var replace = require('gulp-replace');
var rename = require('gulp-rename');
var header = require('gulp-header');
var footer = require('gulp-footer');
var wait = require('gulp-wait');
var debug = require('gulp-debug');
var del = require('del');
var through = require('through2');
var path = require('path');
var fs = require('fs');
var vfs = require('vow-fs');
var File = require('vinyl');

var levels = [
  'variables', // less-only
  'mixins', // less-only
  'normalize',
  'print',
  'glyphicons',
  'scaffolding',
  'core-css'
].map(function(item) { return path.join('levels', item); });

/**
 * Clean all
 */
gulp.task('clean', function(cb) {
  del(['levels', 'fonts', 'docs', '_config.yml'], cb);
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
    'copy-scaffolding',
    'copy-core-css'
  ];
  sequence('copy-fonts',
    levelTasks,
    'compile-blocks', cb);
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
    .pipe(replace('../fonts', '../../../fonts'))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('levels/variables'));
});

/**
 * Mixins level
 */
gulp.task('copy-mixins', ['copy-mixins-itself'], function() {
  return gulp.src(['mixins.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('levels/mixins'));
});

gulp.task('copy-mixins-itself', function() {
  return gulp.src(['mixins/**.less'].map(prefix))
    // clearfix fix
    .pipe(replace('&:extend(.clearfix all);', '.clearfix()'))
    // grid
    .pipe(replace(/\.container-fixed/g, '.grid-fixed'))
    .pipe(replace(/\.col-(xs|sm|md|lg)-@{index}/g, '.grid__cell-$1_size_@{index}'))
    .pipe(replace(/\.col-@{class}-@{index}/g, '.grid__cell-@{class}_size_@{index}'))
    .pipe(replace(/\.col-@{class}-(push|pull|offset)-@{index}/g, '.grid__cell-@{class}_$1_@{index}'))
    .pipe(replace(/\.col-@{class}-(push|pull)-0/g, '.grid__cell-@{class}_$1_0'))
    .pipe(gulp.dest('levels/mixins/mixins/mixins'));
});

/**
 * normalize level
 */
gulp.task('copy-normalize', function() {
  return gulp.src(['normalize.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('levels/normalize'));
});

/**
 * Print level
 */
gulp.task('copy-print', function() {
  return gulp.src(['print.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('levels/print'));
});

/**
 * Glyph level
 */
gulp.task('copy-glyphicons', function() {
  return gulp.src(['glyphicons.less'].map(prefix))
    .pipe(rename(prependFilename))
    .pipe(replace(/.glyphicon-/g, '.glyphicon_item_'))
    .pipe(gulp.dest('levels/glyphicons'));
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

// scaffolding should 100% be in upper level
gulp.task('copy-scaffolding', function() {
  return gulp.src(['scaffolding.less'].map(prefix))
    .pipe(through.obj(function(file, enc, cb) {
      var self = this;
      var block = 'scaffolding';
      var storage = {};
      var content = file.contents.toString('utf8');

      storage = extract(/\.img-(responsive|rounded|thumbnail|circle) ([\s\S]*?})/gim, storage, content,
        ['.img_$1_true $2', 'img']
      );
      content = content.replace(/\.img-(responsive|rounded|thumbnail|circle)([\s\S]*?})/gim, '');

      storage = extract(/hr ([\s\S]*?})/gim, storage, content,
        ['.raw-text hr $1', 'raw-text'],
        ['.hr $1', 'hr']
      );
      content = content.replace(/hr([\s\S]*?})/gim, '');

      storage = extract(/\.sr-only ({[\s\S]*?})/gim, storage, content,
        ['.sr-only $1', 'sr-only']
      );
      content = content.replace(/\.sr-only ({[\s\S]*?})/gim, '');

      storage = extract(/\.sr-only-focusable([\s\S]*?}\n})/gim, storage, content,
        ['.sr-only-focusable $1', 'sr-only']
      );
      content = content.replace(/\.sr-only-focusable([\s\S]*?}\n})/gim, '');

      // console.log('STORAGE');
      // console.log(storage);

      Object.keys(storage).forEach(function(block) {
        self.push(new File({
          path: getBlockPath('core-css', block),
          contents: new Buffer(storage[block].join('\n'))
        }));
      });

      self.push(new File({
        path: getBlockPath('scaffolding', block),
        contents: new Buffer(content)
      }));
      return cb();
    }))
    .pipe(gulp.dest('levels'));
});

gulp.task('copy-core-css', function(cb) {
  sequence('copy-type', 'copy-grid', 'copy-buttons', cb);
});

gulp.task('copy-type', function(cb) {

  return gulp.src(['type.less'].map(prefix))
    .pipe(wait(500))
    /**
     * Headings
     */
    .pipe(replace(/(,[\s]*)/g, ', '))
    .pipe(replace(/[,]* \.h(1|2|3|4|5|6)/g, ''))

    // h1, h2, h3, h4, h5, h6
    .pipe(extractSelector(/h1, h2, h3, h4, h5, h6 [\s\S]*?}\n}/g, 'core-css', 'raw-text', prependHeaderRawText))
    .pipe(replace(/h1, h2, h3, h4, h5, h6/g, '.h1, .h2, .h3, .h4, .h5, .h6'))
    .pipe(extractSelector(/\.h1, \.h2, \.h3, \.h4, \.h5, \.h6[\s\S]*?}\n}/g, 'core-css', 'heading', transfromHeading))
    .pipe(replace(/\.h1, \.h2, \.h3, \.h4, \.h5, \.h6[\s\S]*?}\n}/g, ''))
    // .pipe(wait(500))

    // h1, h2, h3
    .pipe(extractSelector(/h1, h2, h3 [\s\S]*?}\n}/g, 'core-css', 'raw-text', prependHeaderRawText))
    .pipe(replace(/h1, h2, h3/g, '.h1, .h2, .h3'))
    .pipe(extractSelector(/\.h1, \.h2, \.h3[\s\S]*?}\n}/g, 'core-css', 'heading', transfromHeading))
    .pipe(replace(/\.h1, \.h2, \.h3[\s\S]*?}\n}/g, ''))
    // .pipe(wait(500))

    // h4, h5, h6
    .pipe(extractSelector(/h4, h5, h6 [\s\S]*?}\n}/g, 'core-css', 'raw-text', prependHeaderRawText))
    .pipe(replace(/h4, h5, h6/g, '.h4, .h5, .h6'))
    .pipe(extractSelector(/\.h4, \.h5, \.h6[\s\S]*?}\n}/g, 'core-css', 'heading', transfromHeading))
    .pipe(replace(/\.h4, \.h5, \.h6[\s\S]*?}\n}/g, ''))
    // .pipe(wait(500))
    /*
    */

    .pipe(extractSelector(/h(1|2|3|4|5|6) [\s\S]*?}/g, 'core-css', 'raw-text', prependRawText))
    .pipe(replace(/h(1|2|3|4|5|6) {/g, '.heading_level_$1 {'))
    .pipe(extractSelector(/\.heading_level_(1|2|3|4|5|6) [\s\S]*?}/g, 'core-css', 'heading'))
    .pipe(replace(/\.heading_level_(1|2|3|4|5|6) [\s\S]*?}/g, ''))
    .pipe(wait(500))

    /**
     * Body text
     */
    .pipe(extractSelector(/p {[\s\S]*?}/g, 'core-css', 'raw-text', prependRawText))
    .pipe(replace(/p {/g, '.p {'))
    .pipe(extractSelector(/\.p {[\s\S]*?}/g, 'core-css', 'p'))
    .pipe(replace(/\.p {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.lead {[\s\S]*?}\n}/g, 'core-css', 'lead'))
    .pipe(replace(/\.lead {[\s\S]*?}\n}/g, ''))
    .pipe(wait(500))

    /**
     * Emphasis & misc
     */

    .pipe(replace(/\nsmall, \.small {/g, '\ntempsmall {'))
    .pipe(extractSelector(/tempsmall {[\s\S]*?}/g, 'core-css', 'raw-text', function(item) {
      return prependRawText(item.replace(/temp/g, ''));
    }))
    .pipe(extractSelector(/tempsmall {[\s\S]*?}/g, 'core-css', 'small', function(item) {
      return item.replace(/tempsmall/g, '.small');
    }))
    .pipe(replace(/tempsmall {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/cite {[\s\S]*?}/g, 'core-css', 'raw-text', prependRawText))
    .pipe(replace(/cite {/g, '.cite {'))
    .pipe(extractSelector(/\.cite {[\s\S]*?}/g, 'core-css', 'cite'))
    .pipe(replace(/\.cite {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(replace(/mark, .mark {/g, 'mark {'))
    .pipe(extractSelector(/mark {[\s\S]*?}/g, 'core-css', 'raw-text', prependRawText))
    .pipe(replace(/mark {/g, '.mark {'))
    .pipe(extractSelector(/\.mark {[\s\S]*?}/g, 'core-css', 'mark'))
    .pipe(replace(/\.mark {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.text-(left|right|center|justify|nowrap)[\s\S]*?}/g, 'core-css', 'text', function(item) {
      return item.replace(/\.text-/g, '.text_align_');
    }))
    .pipe(replace(/\.text-(left|right|center|justify|nowrap)[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.text-(lowercase|uppercase|capitalize)[\s\S]*?}/g, 'core-css', 'text', function(item) {
      return item.replace(/\.text-/g, '.text_case_');
    }))
    .pipe(replace(/\.text-(lowercase|uppercase|capitalize)[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.text-muted[\s\S]*?}/g, 'core-css', 'text', function(item) {
      return item.replace(/\.text-muted/g, '.text_muted_true');
    }))
    .pipe(replace(/\.text-muted[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.text-(primary|success|info|warning|danger)[\s\S]*?}/g, 'core-css', 'text', function(item) {
      return item.replace(/\.text-(primary|success|info|warning|danger)/g, '.text_theme_$1');
    }))
    .pipe(replace(/\.text-(primary|success|info|warning|danger)[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.bg-(primary|success|info|warning|danger)[\s\S]*?}/g, 'core-css', 'bg', function(item) {
      return item.replace(/\.bg-(primary|success|info|warning|danger)/g, '.bg_theme_$1');
    }))
    .pipe(replace(/\.bg-(primary|success|info|warning|danger)[\s\S]*?}/g, ''))
    .pipe(wait(500))

    /**
     * Page header
     */
    .pipe(extractSelector(/\.page-header[\s\S]*?}/g, 'core-css', 'page-header'))
    .pipe(replace(/\.page-header[\s\S]*?}/g, ''))
    .pipe(wait(500))

    /**
     * Lists
     */
    .pipe(extractSelector(/\nul, ol[\s\S]*?}\n}/g, 'core-css', 'raw-text', function(item) {
      return item.replace(/\nul, ol/g, '.raw-text ul, .raw-text ol');
    }))
    .pipe(replace(/\nul, ol {/g, '\n.list {'))
    .pipe(replace(/  ul, ol {/g, '  .list {'))
    .pipe(extractSelector(/\.list {[\s\S]*?}\n}/g, 'core-css', 'list'))
    .pipe(replace(/\.list {[\s\S]*?}\n}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.list-unstyled {[\s\S]*?}/g, 'core-css', 'list', function(item) {
      return item.replace(/\.list-unstyled {/g, '.list_unstyled_true {');
    }))
    .pipe(replace(/\.list-unstyled {[\s\S]*?}/g, ''))
    .pipe(replace(/\.list-unstyled/g, '.list_unstyled_true'))
    .pipe(wait(500))

    .pipe(extractSelector(/\.list-inline {[\s\S]*?}\n}/g, 'core-css', 'list', function(item) {
      return item.replace(/\.list-inline {/g, '.list_inline_true {').replace(/> li/g, '.list__item');
    }))
    .pipe(replace(/\.list-inline {[\s\S]*?}\n}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/dl {[\s\S]*?}/g, 'core-css', 'raw-text', prependRawText))
    .pipe(extractSelector(/dt, dd {[\s\S]*?}/g, 'core-css', 'raw-text', function(item) {
      return item.replace(/dt, dd/g, '.raw-text dt, .raw-text dd');
    }))
    .pipe(extractSelector(/\ndt {[\s\S]*?}/g, 'core-css', 'raw-text', function(item) {
      return prependRawText(item.replace(/\nd/g, 'd'));
    }))
    .pipe(extractSelector(/\ndd {[\s\S]*?}/g, 'core-css', 'raw-text', function(item) {
      return prependRawText(item.replace(/\nd/g, 'd'));
    }))

    .pipe(replace(/dl {/g, '.dl {'))
    .pipe(extractSelector(/\.dl {[\s\S]*?}/g, 'core-css', 'dl'))
    .pipe(replace(/\.dl {[\s\S]*?}/g, ''))
    .pipe(replace(/dt, dd {/g, '.dl__term, .dl__desc {'))
    .pipe(extractSelector(/\.dl__term, .dl__desc {[\s\S]*?}/g, 'core-css', 'dl'))
    .pipe(wait(500))

    .pipe(replace(/\.dl__term, .dl__desc {[\s\S]*?}/g, ''))
    .pipe(replace(/dt {/g, '.dl__term {'))
    .pipe(replace(/dd {/g, '.dl__desc {'))
    .pipe(extractSelector(/\.dl__term {[\s\S]*?}/, 'core-css', 'dl'))
    .pipe(extractSelector(/\.dl__desc {[\s\S]*?}/, 'core-css', 'dl'))
    .pipe(replace(/\.dl__term {[\s\S]*?}/, ''))
    .pipe(replace(/\.dl__desc {[\s\S]*?}/, ''))
    .pipe(wait(500))

    .pipe(replace(/\.dl-horizontal {/g, '.dl_horizontal_true {'))
    .pipe(extractSelector(/\.dl_horizontal_true {[\s\S]*?}\n}/g, 'core-css', 'dl'))
    .pipe(replace(/\.dl_horizontal_true {[\s\S]*?}\n}/g, ''))
    .pipe(wait(500))

    /**
     * Misc
     */
    .pipe(extractSelector(/abbr\[title\], \/\/[\s\S]*?\nabbr\[data-original-title\] {[\s\S]*?}/g, 'core-css', 'raw-text', function(item) {
      return item.replace(/abbr\[/g, '.raw-text abbr[');
    }))
    .pipe(extractSelector(/abbr\[title\], \/\/[\s\S]*?\nabbr\[data-original-title\] {[\s\S]*?}/g, 'core-css', 'abbr', function(item) {
      return item.replace(/abbr\[/g, '.abbr[');
    }))
    .pipe(replace(/abbr\[title\], \/\/[\s\S]*?\nabbr\[data-original-title\] {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/\.initialism {[\s\S]*?}/g, 'core-css', 'initialism'))
    .pipe(replace(/\.initialism {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/blockquote {[\s\S]*?}\n}/, 'core-css', 'raw-text', prependRawText))
    .pipe(extractSelector(/blockquote {[\s\S]*?}\n}/, 'core-css', 'blockquote', function(item) {
      return item
          .replace(/blockquote {/g, '.blockquote {')
          .replace('p, ul, ol {', 'p, .p, ul, ol, .list {')
          .replace('footer, small, .small {', 'footer, .footer, small, .small {');
    }))
    .pipe(replace(/blockquote {[\s\S]*?}\n}/, ''))
    .pipe(wait(500))

    .pipe(replace('.blockquote-reverse, blockquote.pull-right {', '.blockquote_reverse_true {'))
    .pipe(extractSelector(/\.blockquote_reverse_true {[\s\S]*?}\n}/g, 'core-css', 'blockquote', function(item) {
      return item.replace('footer, small, .small {', 'footer, .footer, small, .small {');
    }))
    .pipe(replace(/\.blockquote_reverse_true {[\s\S]*?}\n}/g, ''))

    .pipe(extractSelector(/blockquote:before, blockquote:after {[\s\S]*?}/g, 'core-css', 'raw-text', function(item) {
      return item.replace(/blockquote/g, '.raw-text blockquote');
    }))
    .pipe(extractSelector(/blockquote:before, blockquote:after {[\s\S]*?}/g, 'core-css', 'blockquote', function(item) {
      return item.replace(/blockquote/g, '.blockquote');
    }))
    .pipe(replace(/blockquote:before, blockquote:after {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(extractSelector(/address {[\s\S]*?}/g, 'core-css', 'raw-text', prependRawText))
    .pipe(extractSelector(/address {[\s\S]*?}/g, 'core-css', 'address'))
    .pipe(replace(/address {[\s\S]*?}/g, ''))
    .pipe(wait(500))

    .pipe(rename(prependFilename))
    .pipe(gulp.dest('levels/core-css'));
});

gulp.task('copy-grid', function() {
  return gulp.src(['grid.less'].map(prefix))
    // grid
    .pipe(replace(/\.container/g, '.grid'))
    // _fluid
    .pipe(replace(/\.container-fluid/g, '.grid_fluid_true'))
    // __row
    .pipe(replace(/\.row/g, '.grid__row'))
    .pipe(rename(prependFilename))
    .pipe(gulp.dest('levels/core-css'));
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
    .pipe(gulp.dest('levels/core-css'));
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
var prependRawText = function(item) { return '.raw-text ' + item; };
var prependHeaderRawText = function(item) { return item.replace(/h(1|2|3|4|5|6)/g, '\n.raw-text h$1'); };
var transfromHeading = function(item) { return item.replace(/\.h(1|2|3|4|5|6)/g, '\n.heading_level_$1'); };
var appendNL = function(item) { return item + '\n'; };
var getBlockPath = function(level, block) { return join(level, block, block + '.less'); };
var extractSelector = function(reg, level, block, transform) {
  transform = transform || function(item) { return item; };
  var folder = path.join('levels', level, block);
  var filename = path.join(folder, block + '.less');
  console.log('filename', filename);

  return through.obj(function(file, enc, cb) {

    var contents = file.contents.toString('utf8');
    var res = contents.match(reg);
    vfs.makeDir(folder).then(function() {
      if (res && res.length > 0) {
        vfs.append(filename, res.map(transform).map(appendNL).join(''), console.log);
      }
    });

    this.push(file);
    return cb();
  });
};

var extract = function(matcher, storage, content) {
  var matched = content.match(matcher);
  if (!matched || matched.length === 0) {
    return storage;
  }

  getArgs.apply(null, arguments).slice(3).map(function(pair) {
    return {
      transform: function(item) { return item.replace(matcher, pair[0]); },
      block: pair[1]
    };
  }).forEach(function(item) {
    if (!storage[item.block]) { storage[item.block] = []; }

    storage[item.block].push(matched.map(item.transform).map(appendNL).join('\n'));
  });

  return storage;
};

function getArgs() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
}

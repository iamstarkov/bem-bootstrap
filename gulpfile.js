'use strict';
var gulp = require('gulp');
var join = require('path').join;
var sequence = require('run-sequence');
var less = require('gulp-less');
var replace = require('gulp-replace');
var header = require('gulp-header');
var debug = require('gulp-debug');
var del = require('del');
var through = require('through2');
var path = require('path');
var File = require('vinyl');

var Storage = require('./storage.js');
var storage = new Storage();

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
 * Make all the stuff
 */
gulp.task('default', function(cb) {
  sequence('clean', ['process-blocks', 'docs'], cb);
});

/**
 * Copy blocks
 */
gulp.task('process-blocks', function(cb) {
  sequence(
    [
      'process-variables-and-mixins',
      'process-reset-and-dependencies',
      'process-core-css'
    ],
    'place-blocks',
    'compile-blocks',
  cb);
});

/**
 * Core variables and mixins
 */
gulp.task('process-variables-and-mixins', ['copy-fonts', 'copy-mixins'], function(done) {
  gulp.src(['variables.less', 'mixins.less'].map(prefix))
    .pipe(replace('&:extend(.clearfix all)', '.clearfix()'))
    .pipe(through.obj(function(file, enc, cb) {
      var content = file.contents.toString('utf8');
      var filename = path.basename(file.relative, '.less');

      if (filename === 'variables') {
        content = content.replace('../fonts', '../../../fonts');
        storage.add('variables', 'variables', content);
      }

      if (filename === 'mixins') {
        storage.add('mixins', 'mixins', content);
      }

      cb();
    }))
    .on('finish', done);
});

gulp.task('copy-fonts', function() {
  return gulp.src(['node_modules/bootstrap/fonts/**']).pipe(gulp.dest('fonts'));
});

gulp.task('copy-mixins', function() {
  return gulp.src(['mixins/**.less'].map(prefix))
    // clearfix fix
    .pipe(replace('&:extend(.clearfix all);', '.clearfix();'))
    // grid
    .pipe(replace(/\.container-fixed/g, '.grid-fixed'))
    .pipe(replace(/\.col-(xs|sm|md|lg)-@{index}/g, '.grid__cell-$1_size_@{index}'))
    .pipe(replace(/\.col-@{class}-@{index}/g, '.grid__cell-@{class}_size_@{index}'))
    .pipe(replace(/\.col-@{class}-(push|pull|offset)-@{index}/g, '.grid__cell-@{class}_$1_@{index}'))
    .pipe(replace(/\.col-@{class}-(push|pull)-0/g, '.grid__cell-@{class}_$1_0'))
    .pipe(gulp.dest('levels/mixins/mixins/mixins'));
});

/**
 * Reset and dependencies
 */
gulp.task('process-reset-and-dependencies', function(done) {
  gulp.src(['normalize.less', 'print.less', 'glyphicons.less'].map(prefix))
    .pipe(replace('&:extend(.clearfix all)', '.clearfix()'))
    .pipe(through.obj(function(file, enc, cb) {
      var content = file.contents.toString('utf8');
      var filename = path.basename(file.relative, '.less');

      if (filename === 'glyphicons') {
        content = content.replace(/.glyphicon-/g, '.glyphicon_item_');
      }

      storage.add(filename, filename, content);

      cb();
    }))
    .on('finish', done);
});

/**
 * Core CSS
 */
gulp.task('process-core-css', function(done) {
  gulp.src([
    'scaffolding.less',
    'type.less',
    // 'code.less',
    'grid.less',
    // 'tables.less',
    // 'forms.less',
    'buttons.less'
  ].map(prefix))
    .pipe(replace('&:extend(.clearfix all)', '.clearfix()'))
    .pipe(through.obj(function(file, enc, cb) {
      var content = file.contents.toString('utf8');
      var filename = path.basename(file.relative, '.less');
      var level = 'core-css';
      var extract = extractFactory(level);

      if (filename === 'scaffolding') {

        extract(/\.img-(responsive|rounded|thumbnail|circle) ([\s\S]*?})/gim, storage, content,
          ['.img_$1_true $2', 'img']
        );
        content = content.replace(/\.img-(responsive|rounded|thumbnail|circle) ([\s\S]*?})/gim, '');

        extract(/hr ([\s\S]*?})/gim, storage, content,
          ['.raw-text hr $1', 'raw-text'],
          ['.hr $1', 'hr']
        );
        content = content.replace(/hr ([\s\S]*?})/gim, '');

        extract(/\.sr-only ({[\s\S]*?})/gim, storage, content,
          ['.sr-only $1', 'sr-only']
        );
        content = content.replace(/\.sr-only ({[\s\S]*?})/gim, '');

        extract(/\.sr-only-focusable ([\s\S]*?}\n})/gim, storage, content,
          ['.sr-only-focusable $1', 'sr-only']
        );
        content = content.replace(/\.sr-only-focusable ([\s\S]*?}\n})/gim, '');

        storage.add(filename, filename, content);
      }

      if (filename === 'type') {
        content = content.replace(/(,[\s]*)/g, ', ');
        content = content.replace(/[,]* \.h(1|2|3|4|5|6)/g, '');

        /**
         * Headings
         */

        // h1, h2, h3, h4, h5, h6
        extract(/h1, h2, h3, h4, h5, h6 ([\s\S]*?}\n})/gim, storage, content,
          [[1, 2, 3, 4, 5, 6].map(function(item) { return '.raw-text ' + item; }).join(',\n') + ' $1', 'raw-text'],
          [[1, 2, 3, 4, 5, 6].map(function(item) { return '.heading_level_' + item; }).join(',\n') + ' $1', 'heading']
        );
        content = content.replace(/h1, h2, h3, h4, h5, h6 ([\s\S]*?}\n})/gim, '');

        // h1, h2, h3
        extract(/h1, h2, h3 ([\s\S]*?}\n})/gim, storage, content,
          [[1, 2, 3].map(function(item) { return '.raw-text ' + item; }).join(',\n') + ' $1', 'raw-text'],
          [[1, 2, 3].map(function(item) { return '.heading_level_' + item; }).join(',\n') + ' $1', 'heading']
        );
        content = content.replace(/h1, h2, h3 ([\s\S]*?}\n})/gim, '');

        // h4, h5, h6
        extract(/h4, h5, h6 ([\s\S]*?}\n})/gim, storage, content,
          [[4, 5, 6].map(function(item) { return '.raw-text ' + item; }).join(',\n') + ' $1', 'raw-text'],
          [[4, 5, 6].map(function(item) { return '.heading_level_' + item; }).join(',\n') + ' $1', 'heading']
        );
        content = content.replace(/h4, h5, h6 ([\s\S]*?}\n})/gim, '');

        // h(1|2|3|4|5|6)
        extract(/h(1|2|3|4|5|6) ([\s\S]*?})/gim, storage, content,
          ['.raw-text h$1 $2', 'raw-text'],
          ['.heading_level_$1 $2', 'heading']
        );
        content = content.replace(/h(1|2|3|4|5|6) ([\s\S]*?})/gim, '');

        /**
         * Body text
         */
        // p
        extract(/p ({[\s\S]*?})/gim, storage, content,
          ['.raw-text p $1', 'raw-text'],
          ['.p $1', 'p']
        );
        content = content.replace(/p ({[\s\S]*?})/gim, '');

        // .lead
        extract(/\.lead ([\s\S]*?}\n})/gim, storage, content,
          ['.lead $1', 'lead']
        );
        content = content.replace(/\.lead ([\s\S]*?}\n})/gim, '');

        /**
         * Emphasis & misc
         */
        // .small
        content = content.replace(/\nsmall, \.small {/g, '\ntempsmall {');
        extract(/tempsmall ({[\s\S]*?})/gim, storage, content,
          ['.raw-text small $1', 'raw-text'],
          ['.small $1', 'small']
        );
        content = content.replace(/tempsmall ({[\s\S]*?})/gim, '');

        // .cite
        extract(/cite ({[\s\S]*?})/gim, storage, content,
          ['.raw-text cite $1', 'raw-text'],
          ['.cite $1', 'cite']
        );
        content = content.replace(/cite ({[\s\S]*?})/gim, '');

        // .mark
        content = content.replace(/mark, .mark {/g, 'mark {');
        extract(/mark ({[\s\S]*?})/gim, storage, content,
          ['.raw-text mark $1', 'raw-text'],
          ['.mark $1', 'mark']
        );
        content = content.replace(/mark ({[\s\S]*?})/gim, '');

        // text
        extract(/\.text-(left|right|center|justify|nowrap) ([\s\S]*?})/gim, storage, content,
          ['.text_align_$1 $2', 'text']
        );
        content = content.replace(/\.text-(left|right|center|justify|nowrap) ([\s\S]*?})/gim, '');

        extract(/\.text-(lowercase|uppercase|capitalize) ([\s\S]*?})/gim, storage, content,
          ['.text_case_$1 $2', 'text']
        );
        content = content.replace(/\.text-(lowercase|uppercase|capitalize) ([\s\S]*?})/gim, '');

        extract(/\.text-muted ([\s\S]*?})/gim, storage, content,
          ['.text_muted_true $1', 'text']
        );
        content = content.replace(/\.text-muted ([\s\S]*?})/gim, '');

        extract(/\.text-(primary|success|info|warning|danger) ([\s\S]*?})/gim, storage, content,
          ['.text_theme_$1 $2', 'text']
        );
        content = content.replace(/\.text-(primary|success|info|warning|danger) ([\s\S]*?})/gim, '');

        // bg
        extract(/\.bg-(primary|success|info|warning|danger) ([\s\S]*?})/gim, storage, content,
          ['.bg_theme_$1 $2', 'bg']
        );
        content = content.replace(/\.bg-(primary|success|info|warning|danger) ([\s\S]*?})/gim, '');

        /**
         * Page header
         */
        extract(/\.page-header ([\s\S]*?})/gim, storage, content,
          ['.page-header $1', 'page-header']
        );
        content = content.replace(/\.page-header ([\s\S]*?})/gim, '');

        /**
         * Lists
         */
        // .list
        extract(/\nul, ol ([\s\S]*?}\n})/gim, storage, content,
          ['.raw-text ul,\n.raw-text ol $1', 'raw-text'],
          ['.list $1', 'list', ['ul, ol', '.list']]
        );
        content = content.replace(/\nul, ol ([\s\S]*?}\n})/gim, '');

        extract(/\.list-unstyled ([\s\S]*?})/gim, storage, content,
          ['.list_unstyled_true $1', 'list']
        );
        content = content.replace(/\.list-unstyled ([\s\S]*?})/gim, '');
        content = content.replace(/\.list-unstyled\(\)/gim, '.list_unstyled_true()');

        extract(/\.list-inline ([\s\S]*?}\n})/gim, storage, content,
          ['.list_inline_true $1', 'list', ['> li', '> .list__item']]
        );
        content = content.replace(/\.list-inline ([\s\S]*?}\n})/gim, '');

        // dl
        extract(/dl ([\s\S]*?})/gim, storage, content,
          ['.raw-text dl $1', 'raw-text'],
          ['.dl $1', 'dl']
        );
        content = content.replace(/dl ([\s\S]*?})/gim, '');

        extract(/dt, dd ([\s\S]*?})/gim, storage, content,
          ['.raw-text dt,\n.raw-text dd $1', 'raw-text'],
          ['.dl__term,\n.dl__desc $1', 'dl']
        );
        content = content.replace(/dt, dd ([\s\S]*?})/gim, '');

        extract(/\ndt ([\s\S]*?})/gim, storage, content,
          ['.raw-text dt $1', 'raw-text'],
          ['.dl__term $1', 'dl']
        );
        content = content.replace(/\ndt ([\s\S]*?})/gim, '');

        extract(/\ndd ([\s\S]*?})/gim, storage, content,
          ['.raw-text dd $1', 'raw-text'],
          ['.dl__desc $1', 'dl']
        );
        content = content.replace(/\ndd ([\s\S]*?})/gim, '');

        extract(/\ndd ([\s\S]*?})/gim, storage, content,
          ['.raw-text dd $1', 'raw-text'],
          ['.dl__desc $1', 'dl']
        );
        content = content.replace(/\ndd ([\s\S]*?})/gim, '');

        extract(/\.dl-horizontal ([\s\S]*?}\n})/gim, storage, content,
          ['.dl_horizontal_true $1', 'dl', [/dd {/gim, '.dl__desc {'], [/dt {/gim, '.dl__term {']]
        );
        content = content.replace(/\.dl-horizontal ([\s\S]*?}\n})/gim, '');

        /**
         * Misc
         */
        extract(/(abbr)([\s\S]*?})/gm, storage, content,
          ['$1$2', 'raw-text', [/abbr\[/gim, '.raw-text abbr[']],
          ['$1$2', 'abbr', [/abbr\[/gim, '.abbr[']]
        );
        content = content.replace(/abbr([\s\S]*?})/gm, '');

        extract(/\.initialism ([\s\S]*?})/gim, storage, content,
          ['.initialism $1', 'initialism']
        );
        content = content.replace(/\.initialism ([\s\S]*?})/gim, '');

        extract(/(blockquote) ([\s\S]*?}\n})/gim, storage, content,
          ['.raw-text $1 $2', 'raw-text'],
          ['.$1 $2', 'blockquote',
            ['p, ul, ol {', 'p, .p, ul, ol, .list {'],
            ['footer, small, .small {', 'footer, .footer, small, .small {'],
          ]
        );
        content = content.replace(/(blockquote) ([\s\S]*?}\n})/gim, '');

        content = content.replace(', blockquote.pull-right', '');
        extract(/(\.blockquote-reverse) ([\s\S]*?}\n})/gim, storage, content,
          ['.blockquote_reverse_true $2', 'blockquote',
            ['p, ul, ol {', 'p, .p, ul, ol, .list {'],
            ['footer, small, .small {', 'footer, .footer, small, .small {'],
          ]
        );
        content = content.replace(/(\.blockquote-reverse) ([\s\S]*?}\n})/gim, '');

        extract(/(blockquote:before, blockquote:after) ([\s\S]*?})/gm, storage, content,
          ['$1 $2', 'raw-text', [/blockquote/gim, '.blockquote']],
          ['$1 $2', 'blockquote', [/blockquote/gim, '.blockquote']]
        );
        content = content.replace(/(blockquote:before, blockquote:after) ([\s\S]*?})/gm, '');

        // address
        extract(/(address) ([\s\S]*?})/gim, storage, content,
          ['.raw-text $1 $2', 'raw-text'],
          ['.$1 $2', 'address']
        );
        content = content.replace(/(address) ([\s\S]*?})/gim, '');
      }

      if (filename === 'grid') {
        content = content.replace(/\.container/g, '.grid');
        content = content.replace(/\.container-fluid/g, '.grid_fluid_true');
        content = content.replace(/\.row/g, '.grid__row');

        storage.add(level, filename, content);
      }

      if (filename === 'buttons') {
        content = content.replace(/\&\.(active|disabled)/g, '&.btn_state_$1');
        content = content.replace(/\.btn-(lg|sm|xs)/g, '.btn_size_$1');
        content = content.replace(/\.btn-(default|primary|success|info|warning|danger)/g, '.btn_theme_$1');
        content = content.replace(/\.btn-link/g, '.btn_link_true');
        content = content.replace(/\.btn-block/g, '.btn_block_true');

        storage.add(level, filename, content);
      }

      cb();
    }))
    .on('finish', done);
});

/**
 * Placing blocks in proper way
 */
gulp.task('place-blocks', function() {
  return gulp.src('gulpfile.js')
    .pipe(placeBlocks())
    .pipe(gulp.dest('levels'));
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

/**
 * Docs
 */
gulp.task('docs', function(cb) {
  sequence(['docs-yamlconfig', 'docs-site'], cb);
});

gulp.task('docs-yamlconfig', function() {
  return gulp.src('./node_modules/bootstrap/_config.yml').pipe(gulp.dest('./'));
});

gulp.task('docs-site', function() {
  return gulp.src('./node_modules/bootstrap/docs/**').pipe(gulp.dest('./docs/'));
});

/**
 * Helpers
 */
var prefix = function(item) { return join('node_modules/bootstrap/less', item); };
var appendNL = function(item) { return item + '\n'; };
var getBlockPath = function(level, block) { return join(level, block, block + '.less'); };
var extractFactory = function(level) {
  return function(matcher, storage, content) {
    var matched = content.match(matcher);
    if (!matched || matched.length === 0) {
      return storage;
    }

    getArgs.apply(null, arguments).slice(3).map(function(pair) {
      var block = pair[1];
      var innerTransforms = pair.slice(2);
      return {
        transform: function(item) { return item.replace(matcher, pair[0]); },
        block: block,
        innerTransform: function(item) {
          innerTransforms.forEach(function(transformPair) {
            item = item.replace(transformPair[0], transformPair[1]);
          });

          return item;
        }
      };
    }).forEach(function(item) {
      var res = matched.map(item.transform).map(item.innerTransform).map(appendNL).join('\n');

      storage.add(level, item.block, res);
    });
  };
};
var placeBlocks = function() {
  return through.obj(function(file, enc, cb) {
    var self = this;
    Object.keys(storage.storage).forEach(function(level) {
      Object.keys(storage.storage[level]).forEach(function(block) {
        self.push(new File({
          path: getBlockPath(level, block),
          contents: new Buffer(storage.get(level, block))
        }));
      });
    });
  });
};

var getArgs = function() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
};

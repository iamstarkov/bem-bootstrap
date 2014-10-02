'use strict';
var path = require('path');
var File = require('vinyl');

var gulp = require('gulp');
var del = require('del');
var sequence = require('run-sequence');
var less = require('gulp-less');
var replace = require('gulp-replace');
var header = require('gulp-header');
var debug = require('gulp-debug');
var through = require('through2');

var storage = new (require('./storage.js'))();
var prefix = require('./prefix-levels');

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
gulp.task('clean-docs', function(cb) {
  del(['fonts', 'docs', '_config.yml'], cb);
});

gulp.task('clean-blocks', function(cb) {
  del('levels', cb);
});

/**
 * Make all the stuff
 */
gulp.task('default', ['blocks', 'docs']);

/**
 * Copy blocks
 */
gulp.task('blocks', function(cb) {
  sequence(
    'clean-blocks',
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
    'code.less',
    'grid.less',
    // 'tables.less',
    // 'forms.less',
    'buttons.less'
  ].map(prefix))
    .pipe(replace('&:extend(.clearfix all)', '.clearfix()'))
    .pipe(through.obj(function(file, enc, cb) {
      var filename = path.basename(file.relative, '.less');
      storage.content = file.contents.toString('utf8');
      storage.level = 'core-css';

      if (filename === 'scaffolding') {

        storage
          .cut(/\.img-(responsive|rounded|thumbnail|circle) ([\s\S]*?})/gim,
            ['.img_$1_true $2', 'img'])
          .cut(/hr ([\s\S]*?})/gim,
            ['.raw-text hr $1', 'raw-text'],
            ['.hr $1', 'hr'])
          .cut(/\.sr-only ({[\s\S]*?})/gim,
            ['.sr-only $1', 'sr-only'])
          .cut(/\.sr-only-focusable ([\s\S]*?}\n})/gim,
            ['.sr-only-focusable $1', 'sr-only']);

        storage.add(filename, filename, storage.content);
      }

      if (filename === 'type') {
        storage.content = storage.content.replace(/(,[\s]*)/g, ', ');
        storage.content = storage.content.replace(/[,]* \.h(1|2|3|4|5|6)/g, '');

        storage
          /**
           * Headings
           */
          // h1, h2, h3, h4, h5, h6
          .cut(/h1, h2, h3, h4, h5, h6 ([\s\S]*?}\n})/gim,
            [[1, 2, 3, 4, 5, 6].map(function(item) { return '.raw-text h' + item; }).join(',\n') + ' $1', 'raw-text'],
            [[1, 2, 3, 4, 5, 6].map(function(item) { return '.heading_level_' + item; }).join(',\n') + ' $1', 'heading']
          )
          // h1, h2, h3
          .cut(/h1, h2, h3 ([\s\S]*?}\n})/gim,
            [[1, 2, 3].map(function(item) { return '.raw-text h' + item; }).join(',\n') + ' $1', 'raw-text'],
            [[1, 2, 3].map(function(item) { return '.heading_level_' + item; }).join(',\n') + ' $1', 'heading']
          )
          // h4, h5, h6
          .cut(/h4, h5, h6 ([\s\S]*?}\n})/gim,
            [[4, 5, 6].map(function(item) { return '.raw-text h' + item; }).join(',\n') + ' $1', 'raw-text'],
            [[4, 5, 6].map(function(item) { return '.heading_level_' + item; }).join(',\n') + ' $1', 'heading']
          )
          // h(1|2|3|4|5|6)
          .cut(/h(1|2|3|4|5|6) ([\s\S]*?})/gim,
            ['.raw-text h$1 $2', 'raw-text'],
            ['.heading_level_$1 $2', 'heading'])

          /**
           * Body text
           */
          // p
          .cut(/p ({[\s\S]*?})/gim,
            ['.raw-text p $1', 'raw-text'],
            ['.p $1', 'p'])
          // .lead
          .cut(/\.lead ([\s\S]*?}\n})/gim,
            ['.lead $1', 'lead']);

        /**
         * Emphasis & misc
         */
        // .small
        storage
          .cut(/small ({[\s\S]*?})/im,
            ['.raw-text small $1', 'raw-text'],
            ['.small $1', 'small'])
          // .cite
          .cut(/cite ({[\s\S]*?})/gim,
            ['.raw-text cite $1', 'raw-text'],
            ['.cite $1', 'cite'])

        // .mark
          .replace(/mark, .mark {/g, 'mark {')
          .cut(/mark ({[\s\S]*?})/gim,
            ['.raw-text mark $1', 'raw-text'],
            ['.mark $1', 'mark'])
          // text
          .cut(/\.text-(left|right|center|justify|nowrap) ([\s\S]*?})/gim,
            ['.text_align_$1 $2', 'text'])
          .cut(/\.text-(lowercase|uppercase|capitalize) ([\s\S]*?})/gim,
            ['.text_case_$1 $2', 'text'])
          .cut(/\.text-muted ([\s\S]*?})/gim,
            ['.text_muted_true $1', 'text'])
          .cut(/\.text-(primary|success|info|warning|danger) ([\s\S]*?})/gim,
            ['.text_theme_$1 $2', 'text'])
          // bg
          .cut(/\.bg-(primary|success|info|warning|danger) ([\s\S]*?})/gim,
            ['.bg_theme_$1 $2', 'bg'])

          /**
           * Page header
           */
          .cut(/\.page-header ([\s\S]*?})/gim,
            ['.page-header $1', 'page-header'])

          /**
           * Lists
           */
          // .list
          .cut(/\nul, ol ([\s\S]*?}\n})/gim,
            ['.raw-text ul,\n.raw-text ol $1', 'raw-text'],
            ['.list $1', 'list', ['ul, ol', '.list']])
          .cut(/\.list-unstyled ([\s\S]*?})/gim,
            ['.list_unstyled_true $1', 'list'])
          .replace(/\.list-unstyled\(\)/gim, '.list_unstyled_true()')

          .cut(/\.list-inline ([\s\S]*?}\n})/gim,
            ['.list_inline_true $1', 'list', ['> li', '> .list__item']])
          // dl
          .cut(/dl ([\s\S]*?})/gim,
            ['.raw-text dl $1', 'raw-text'],
            ['.dl $1', 'dl'])
          .cut(/dt, dd ([\s\S]*?})/gim,
            ['.raw-text dt,\n.raw-text dd $1', 'raw-text'],
            ['.dl__term,\n.dl__desc $1', 'dl'])
          .cut(/\ndt ([\s\S]*?})/gim,
            ['.raw-text dt $1', 'raw-text'],
            ['.dl__term $1', 'dl'])
          .cut(/\ndd ([\s\S]*?})/gim,
            ['.raw-text dd $1', 'raw-text'],
            ['.dl__desc $1', 'dl'])
          .cut(/\ndd ([\s\S]*?})/gim,
            ['.raw-text dd $1', 'raw-text'],
            ['.dl__desc $1', 'dl'])
          .cut(/\.dl-horizontal ([\s\S]*?}\n})/gim,
            ['.dl_horizontal_true $1', 'dl', [/dd {/gim, '.dl__desc {'], [/dt {/gim, '.dl__term {']])

          /**
           * Misc
           */
          .cut(/(abbr)([\s\S]*?})/gm,
            ['$1$2', 'raw-text', [/abbr\[/gim, '.raw-text abbr[']],
            ['$1$2', 'abbr', [/abbr\[/gim, '.abbr[']])
          .cut(/\.initialism ([\s\S]*?})/gim,
            ['.initialism $1', 'initialism'])
          .cut(/(blockquote) ([\s\S]*?}\n})/gim,
            ['.raw-text $1 $2', 'raw-text'],
            ['.$1 $2', 'blockquote',
              ['p, ul, ol {', 'p, .p, ul, ol, .list {'],
              ['footer, small, .small {', 'footer, .footer, small, .small {'],
            ]
          )

          .remove(', blockquote.pull-right')
          .cut(/(\.blockquote-reverse) ([\s\S]*?}\n})/gim,
            ['.blockquote_reverse_true $2', 'blockquote',
              ['p, ul, ol {', 'p, .p, ul, ol, .list {'],
              ['footer, small, .small {', 'footer, .footer, small, .small {'],
            ]
          )
          .cut(/(blockquote:before, blockquote:after) ([\s\S]*?})/gm,
            ['$1 $2', 'raw-text', [/blockquote/gim, '.raw-text blockquote']],
            ['$1 $2', 'blockquote', [/blockquote/gim, '.blockquote']])
          // address
          .cut(/(address) ([\s\S]*?})/gim,
            ['.raw-text $1 $2', 'raw-text'],
            ['.$1 $2', 'address']);
      }

      if (filename === 'code') {
        storage.replace(/,\n/g, ', ');

        ['code', 'kbd', 'pre', 'samp'].forEach(function(item) {
          storage.copy(/(code, kbd, pre, samp) ([\s\S]*?})/gim,
            [ '.' + item + ' $2', item],
            [ '.raw-text ' + item + ' $2', 'raw-text']
          );
        });
        storage.remove(/(code, kbd, pre, samp) ([\s\S]*?})/gim);

        storage
          .cut(/(code) ({[\s\S]*?})/im,
            [ '.$1 $2', 'code'],
            [ '.raw-text $1 $2', 'raw-text'])
          .cut(/(kbd) ({[\s\S]*?}\n})/gim,
            [ '.$1 $2', 'kbd', [/(\n[\s]+)kbd/, '$1.kbd']],
            [ '.raw-text $1 $2', 'raw-text'])
          .cut(/(pre) ({[\s\S]*?}\n})/gim,
            [ '.$1 $2', 'pre', ['code {', '.code {']],
            [ '.raw-text $1 $2', 'raw-text'])
          .cut(/(\.pre-scrollable) ({[\s\S]*?})/gim,
            [ '$1 $2', 'pre', ['pre-scrollable', 'pre_scrollable_true']]);
      }

      if (filename === 'grid') {
        storage.replace(/\.container/g, '.grid')
                .replace(/\.container-fluid/g, '.grid_fluid_true')
                .replace(/\.row/g, '.grid__row')
                .add(storage.level, filename, storage.content);
      }

      if (filename === 'buttons') {
        storage.replace(/\&\.(active|disabled)/g, '&.btn_state_$1')
                .replace(/\.btn-(lg|sm|xs)/g, '.btn_size_$1')
                .replace(/\.btn-(default|primary|success|info|warning|danger)/g, '.btn_theme_$1')
                .replace(/\.btn-link/g, '.btn_link_true')
                .replace(/\.btn-block/g, '.btn_block_true')
                .add(storage.level, filename, storage.content);
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
    .pipe(through.obj(function(file, enc, cb) {
      var self = this;
      Object.keys(storage.storage).forEach(function(level) {
        Object.keys(storage.storage[level]).forEach(function(block) {
          self.push(new File({
            path: path.join(level, block, block + '.less'),
            contents: new Buffer(storage.get(level, block))
          }));
        });
      });
      cb();
    }))
    .pipe(gulp.dest('levels'));
});

/**
 * Compiling blocks
 */
gulp.task('compile-blocks', function() {
  var postfix = function(item) { return path.join(item, '*/*.less'); };
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
  sequence('clean-docs', ['docs-yamlconfig', 'docs-site'], cb);
});

gulp.task('docs-yamlconfig', function() {
  return gulp.src('./node_modules/bootstrap/_config.yml').pipe(gulp.dest('./'));
});

gulp.task('docs-site', function() {
  return gulp.src('./node_modules/bootstrap/docs/**').pipe(gulp.dest('./docs/'));
});

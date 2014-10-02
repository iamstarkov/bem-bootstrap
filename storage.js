'use strict';
var appendNL = function(item) { return item + '\n'; };
var getArgs = function() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
};

var Storage = function() {
  this.content = '';
  this.level = '';
  this.storage = {};
};

Storage.prototype.get = function(level, block) {
  return this.storage[level][block].join('\n');
};

Storage.prototype.replace = function() {
  this.content = this.content.replace.apply(this.content, arguments);
  return this;
};

Storage.prototype.remove = function(matcher) {
  return this.replace(matcher, '');
};

Storage.prototype.copy = function(matcher) {
  var self = this;
  var matched = self.content.match(matcher);

  if (!matched || matched.length === 0) {
    return self;
  }

  if (!matcher.global) {
    matched = [matched[0]];
  }

  getArgs.apply(null, arguments).slice(1).map(function(pair) {
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

    self.add(self.level, item.block, res);
  });

  return self;
};

Storage.prototype.cut = function(matcher) {
  return this.copy.apply(this, arguments).remove(matcher);
};

Storage.prototype.add = function(level, block, content) {
  if (!this.storage[level]) { this.storage[level] = {}; }
  if (!this.storage[level][block]) { this.storage[level][block] = []; }

  this.storage[level][block].push(content);
};

module.exports = Storage;

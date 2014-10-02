'use strict';

var appendNL = function(item) { return item + '\n'; };
var getArgs = function() {
  var args = new Array(arguments.length);
  for (var i = 0; i < args.length; ++i) {
    args[i] = arguments[i];
  }
  return args;
};

module.exports = function(level) {
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

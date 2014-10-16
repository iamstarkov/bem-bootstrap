'use strict';
var join = require('path').join;

module.exports = {
  prefixLess: function(item) {
    return join('node_modules/bootstrap/less', item);
  },

  prefixJS: function(item) {
    return join('node_modules/bootstrap/js', item);
  }
};

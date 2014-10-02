'use strict';
var join = require('path').join;

module.exports = function(item) {
  return join('node_modules/bootstrap/less', item);
};

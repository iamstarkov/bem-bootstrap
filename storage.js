'use strict';

var Storage = function() {
  this.storage = {};
};

Storage.prototype.get = function(level, block) {
  return this.storage[level][block].join('\n');
};

Storage.prototype.add = function(level, block, content) {
  if (!this.storage[level]) { this.storage[level] = {}; }
  if (!this.storage[level][block]) { this.storage[level][block] = []; }

  this.storage[level][block].push(content);
};

module.exports = Storage;

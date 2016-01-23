'use strict';

var TestAdapter = require('./test-adapter');
var TestAdapterClone = function(config) {
    TestAdapterClone.initialized = true;
    var adapter = TestAdapter(config);
    adapter.name = 'testClone';
    return adapter;
};

TestAdapterClone.initialized = false;
module.exports = TestAdapterClone;

'use strict';

var TestAdapterClone = function(config) {
    var TestAdapter = require('../test-adapter');
    TestAdapterClone.initialized = true;
    var adapter = TestAdapter(config);
    adapter.name = 'testClone';
    return adapter;
};

TestAdapterClone.initialized = false;
module.exports = TestAdapterClone;

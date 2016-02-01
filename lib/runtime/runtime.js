'use strict';

/* Juttle runtime. */

var modules = require('./modules');
var ops = require('./ops');
var partialOps = require('./partial-ops');
var values = require('./values');
var types = require('./types');
var errors = require('../errors');

var runtime = {
    modules: modules,
    ops: ops,
    partialOps: partialOps,
    values: values,
    types: types,
    errors: errors
};

module.exports = runtime;

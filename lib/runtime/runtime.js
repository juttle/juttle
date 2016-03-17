'use strict';

/* Juttle runtime. */

var modules = require('./modules');
var ops = require('./ops');
var partialOps = require('./partial-ops');
var values = require('./values');
var types = require('./types');
var procs = require('./procs');
var reducers = require('./reducers').reducers;
var errors = require('../errors');
var utils = require('./juttle-utils');

var runtime = {
    modules: modules,
    ops: ops,
    partialOps: partialOps,
    values: values,
    types: types,
    procs: procs,
    reducers: reducers,
    errors: errors,
    utils: utils
};

module.exports = runtime;

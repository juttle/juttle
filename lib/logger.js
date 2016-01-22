'use strict';

//
// To support embedding Juttle in various application environments with their
// respective logging approaches, the compiler and runtime use a thin API to
// obtain an object that can be used for logging. By default no logs are
// emitted.
//
// The `getLogger(name)` entry point exposed by this module should return an
// object containing handlers for the various logging levels (error, warn, info,
// debug). Each should serialize their arguments to a string similar to how
// `console.log` works.
//
// For example, the following would enable console logging for info and above
// but not for debug level.
//
// var JuttleLogger = require('lib/logger');
// JuttleLogger.getLogger = function(name) {
//     return {
//         error: console.error,
//         warn: console.warn,
//         info: console.log,
//         debug: function() {}
//     };
// };
//
// Alternatively an existing logging implementation like log4js could be
// trivially integrated by:
//
// var JuttleLogger = require('lib/logger');
// var log4js = require('log4js');
// JuttleLogger.getLogger = log4js.getLogger;
//
// The `bin/juttle` CLI and all unit tests use log4js in this manner. The
// default logging level is info, but debug logs can be enabled by setting the
// `DEBUG` environment variable.

var NullLogger = {
    error: function() {},
    warn: function() {},
    info: function() {},
    debug: function() {}
};

var JuttleLogger = {
    getLogger: function(name) { return NullLogger; }
};

module.exports = JuttleLogger;

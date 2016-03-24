'use strict';
let JuttleLogger = require('../logger');
let log4js = require('log4js');
let _ = require('underscore');

// Initialize the Juttle Logger to use log4js. By default all targets are set to
// info level, but individual targets (or all targets) can be enabled at debug
// level with the DEBUG environment letiable.
function logSetup() {
    JuttleLogger.getLogger = log4js.getLogger;

    let levels = {
        '[all]': 'info'
    };

    // Handle node.js style debug configuration where DEBUG is a
    // comma-separated list of debug targets, or '*' to enable all
    // debugging.
    let DEBUG = process.env.DEBUG;
    if (DEBUG) {
        let targets = DEBUG.split(',');
        _.each(targets, function(target) {
            if (target === '*') { target = '[all]'; }
            levels[target] = 'debug';
        });
    }

    log4js.configure({
        levels: levels,
        appenders: [{type: __dirname + '/stderr-appender'}]
    });

    JuttleLogger.getLogger('cli').debug('set logging levels to', levels);
}

module.exports = logSetup;

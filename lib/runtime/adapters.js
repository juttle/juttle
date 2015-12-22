//
// Simple table of registered adapters
//
// jshint node:true
var _ = require('underscore');
var path = require('path');
var errors = require('../errors');
var logger = require('../logger').getLogger('juttle-adapter');

var adapters = {};

function register(type, module) {
    if (adapters[type]) {
        throw new Error('adapter ' + type + ' already registered');
    }
    adapters[type] = module;
}

function get(type) {
    // XXX this should be thrown sooner so we get location info
    if (! adapters[type]) {
        throw errors.compileError('RT-INVALID-ADAPTER', {type: type});
    }

    return adapters[type];
}

// Load and initialize the adapter modules specified in the given config.
function load(config) {
    logger.debug('loading adapters');
    _.each(config, function(options, module) {
        try {
            var module_path = options.path || module;
            if (module_path[0] === '.') {
                module_path = path.resolve(process.cwd(), module_path);
            }

            var start = new Date();
            var init = require(module_path);

            var loaded = new Date();
            var adapter = init(options);

            var initialized = new Date();

            logger.debug(adapter.name, 'adapter loaded in', (loaded - start), 'ms,',
                         'initialized in', (initialized - loaded), 'ms');

            register(adapter.name, adapter);
        } catch (err) {
            logger.error('error loading adapter ' + module + ': ' + err.message);
            throw err;
        }
    });
}

module.exports = {
    register: register,
    get: get,
    load: load
};

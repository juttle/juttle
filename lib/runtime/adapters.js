//
// Simple table of registered adapters
//
// jshint node:true
var _ = require('underscore');
var path = require('path');
var errors = require('../errors');
var logger = require('../logger').getLogger('juttle-adapter');

var adapters = {};
var adapterConfig = {};

function register(type, module) {
    if (adapters[type]) {
        throw new Error('adapter ' + type + ' already registered');
    }
    adapters[type] = module;
}

function get(type) {
    if (adapters[type]) {
        return adapters[type];
    }

    if (adapterConfig[type]) {
        var adapter = loadAdapter(type);
        return adapter;
    }

    // XXX this should include location info
    throw errors.compileError('RT-INVALID-ADAPTER', {type: type});
}

// Load the adapter of the given type.
function loadAdapter(type) {
    var options = adapterConfig[type];
    try {
        // If the path isn't specified in the config, assume there is a global
        // installation of the module named `juttle-xyz-adapter`.
        var module_path = options.path || 'juttle-' + type + '-adapter';

        // Any relative module paths should be resolved in the context of the
        // process cwd, not relative to this module
        if (module_path[0] === '.') {
            module_path = path.resolve(process.cwd(), module_path);
        }

        var start = new Date();
        var init = require(module_path);

        var loaded = new Date();
        var adapter = init(options);

        if (adapter.name !== type) {
            throw new Error('adapter name ', adapter.name, ' != type ', type);
        }
        var initialized = new Date();

        logger.debug(adapter.name, 'adapter loaded in', (loaded - start), 'ms,',
                     'initialized in', (initialized - loaded), 'ms');

        register(adapter.name, adapter);

        return adapter;
    } catch (err) {
        logger.error('error loading adapter ' + module + ': ' + err.message);
        throw err;
    }
}

// Add configuration for the specified adapters but don't initialize them until
// they are actually used.
function configure(config) {
    logger.debug('configuring adapters', _.keys(config).join(','));
    _.each(config, function(options, type) {
        adapterConfig[type] = options;
    });
}

module.exports = {
    register: register,
    get: get,
    configure: configure
};

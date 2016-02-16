'use strict';

//
// Simple table of registered adapters
//
var juttleVersion = require('../../package').version;
var _ = require('underscore');
var path = require('path');
var errors = require('../errors');
var Module = require('module');
var logger = require('../logger').getLogger('juttle-adapter');
var JuttleAdapterAPI = require('../adapters/api');

var BUILTIN_ADAPTERS = ['file', 'http', 'stdio', 'stochastic', 'http_server'];

var adapters = {};
var adapterConfig = {};

function register(type, module) {
    if (adapters[type]) {
        throw new Error('adapter ' + type + ' already registered');
    }
    adapters[type] = module;
}

function get(type, location) {
    if (adapters[type]) {
        return adapters[type];
    }

    if (adapterConfig[type]) {
        var adapter = loadAdapter(type);
        return adapter;
    }

    throw errors.compileError('INVALID-ADAPTER', {
        location: location,
        type: type
    });
}

function isValid(type) {
    return (adapters[type] || adapterConfig[type]) ? true : false;
}

function adapterModulePath(type, options) {
    // If the path isn't specified in the config, assume there is a global
    // installation of the module named `juttle-xyz-adapter`.
    var modulePath = options.path || 'juttle-' + type + '-adapter';

    // Any relative module paths should be resolved in the context of the
    // process cwd, not relative to this module
    if (modulePath[0] === '.') {
        modulePath = path.resolve(process.cwd(), modulePath);
    }

    return modulePath;
}

// Load the adapter of the given type.
function loadAdapter(type) {
    var options = adapterConfig[type];
    try {
        var modulePath = adapterModulePath(type, options);

        global.JuttleAdapterAPI = JuttleAdapterAPI;

        var start = new Date();
        var init = require(modulePath);

        var loaded = new Date();
        var adapter = init(options);

        global.JuttleAdapterAPI = undefined;

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
    config = config || {};
    logger.debug('configuring adapters', _.keys(config).join(','));
    _.extend(adapterConfig, _.clone(config));

    logger.debug('configuring builtin adapters');
    _.each(BUILTIN_ADAPTERS, function(adapter) {
        adapterConfig[adapter] = {
            path: path.resolve(__dirname, '../adapters/' + adapter)
        };
    });
}

// Return a list of all configured adapters and their versions.
function list() {
    var adapters = [];
    _.each(adapterConfig, function(config, adapter) {
        var modulePath = adapterModulePath(adapter, config);
        var version, installPath;

        if (BUILTIN_ADAPTERS.indexOf(adapter) !== -1) {
            version = juttleVersion;
            installPath = Module._resolveFilename(modulePath, module);
        } else {
            try {
                var pkg = require(path.join(modulePath, 'package'));
                installPath = Module._resolveFilename(modulePath, module);
                version = pkg.version || '(unknown)';
            } catch (err) {
                installPath = '(unable to load adapter)';
                version = '(unknown)';
            }
        }
        adapters.push({adapter: adapter, version: version, path: installPath});
    });
    return adapters;
}
module.exports = {
    register: register,
    get: get,
    list: list,
    isValid: isValid,
    configure: configure
};

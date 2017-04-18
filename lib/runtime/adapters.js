'use strict';

//
// Simple table of registered adapters
//
var juttleVersion = require('../../package').version;
var _ = require('underscore');
var path = require('path');
var semver = require('semver');
var errors = require('../errors');
var Module = require('module');
var logger = require('../logger').getLogger('juttle-adapter');
var JuttleAdapterAPI = require('../adapters/api');

var BUILTIN_ADAPTERS = ['file', 'http', 'stdio', 'stochastic', 'http_server', 'shell'];

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
        var adapter = loadAdapter(type, location);
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
function loadAdapter(type, location) {
    var options = adapterConfig[type];
    try {
        var modulePath = adapterModulePath(type, options);

        global.JuttleAdapterAPI = JuttleAdapterAPI;

        var start = new Date();

        if (!options.builtin) {
            checkCompatible(type, modulePath, location);
        }

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
        logger.error('error loading adapter ' + type + ': ' + err.message);
        throw err;
    }
}

// Check whether the given adapter is compatible with this version of the juttle
// runtime by extracting the juttleAdapterAPI entry from the adapter's
// package.json and comparing it to the declared version of the API.
function checkCompatible(type, modulePath, location) {
    var adapterPackage = require(path.join(modulePath, 'package.json'));
    var adapterJuttleVersion = adapterPackage.juttleAdapterAPI;
    if (!adapterJuttleVersion) {
        throw errors.compileError('INCOMPATIBLE-ADAPTER', {
            type,
            adapterJuttleVersion: '(unknown)',
            apiVersion: JuttleAdapterAPI.version,
            location
        });
    }

    if (!semver.satisfies(JuttleAdapterAPI.version, adapterJuttleVersion)) {
        throw errors.compileError('INCOMPATIBLE-ADAPTER', {
            type,
            adapterJuttleVersion,
            apiVersion: JuttleAdapterAPI.version,
            location
        });
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
            path: path.resolve(__dirname, '../adapters/' + adapter),
            builtin: true
        };
    });
}

// Return a list of all configured adapters and their versions.
function list() {
    var adapters = [];
    _.each(adapterConfig, function(config, adapter) {
        var modulePath = adapterModulePath(adapter, config);
        var version, installPath, moduleName;

        var isBuiltin = BUILTIN_ADAPTERS.indexOf(adapter) !== -1;
        var loaded = true;
        if (isBuiltin) {
            version = juttleVersion;
            installPath = Module._resolveFilename(modulePath, module);
            moduleName = '(builtin)';
        } else {
            try {
                var packagePath = path.join(modulePath, 'package');
                var pkg = require(packagePath);
                installPath = path.dirname(Module._resolveFilename(packagePath, module));
                version = pkg.version || '(unknown)';
                moduleName = pkg.name;
            } catch (err) {
                installPath = '(unable to load adapter)';
                version = '(unknown)';
                moduleName = '(unknown)';
                loaded = false;
            }
        }
        adapters.push({adapter: adapter, builtin: isBuiltin, module: moduleName, version: version, path: installPath, loaded: loaded});
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

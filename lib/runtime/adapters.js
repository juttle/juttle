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

// Because adapters pull in the Juttle runtime via require('juttle/lib/xyz'),
// there's a chance that loading an adapter may load another copy of the runtime
// code, depending on the specifics of how the user installed the various node
// modules.
//
// This causes problems if identical code is loaded from two different paths,
// since `instanceof` will fail to match an object created from one copy to the
// class definition in another copy.
//
// To avoid these issues, before loading the adapter, intercept the node.js module
// loader and if there is a conflict for juttle, log a warning and rewrite any
// require requests for `juttle/*` to be relative paths using the _current_ module
// (i.e.  lib/runtime/adapters.js) as the context.
//
// This ensures that only one implementation will be loaded into memory.
var moduleLoad = Module._load;
var reportModuleConflict = _.once(function(origFilename, newFilename) {
    var origPath = origFilename.replace(/juttle\/.*$/, 'juttle');
    var newPath = newFilename.replace(/juttle\/.*$/, 'juttle');
    var shouldLoad = process.env.JUTTLE_RESOLVE_ADAPTER_CONFLICT !== undefined;
    if (shouldLoad) {
        logger.warn('detected juttle module conflict:',
                    'loading from', newPath, 'instead of', origPath);
    } else {
        logger.error('detected juttle module conflict:',
                     'runtime in', newPath, 'but adapter resolved', origPath,
                     '... exiting');
        process.exit(1);
    }
});

function startModuleLoadOverride() {
    Module._load = function(request, parent, isMain) {
        if (request.split('/')[0] === 'juttle') {
            var origRequest = request;
            var newRequest = request.replace(/^juttle/, '../..');
            var origFilename = Module._resolveFilename(origRequest, parent);
            var newFilename = Module._resolveFilename(newRequest, module);

            if (origFilename !== newFilename) {
                reportModuleConflict(origFilename, newFilename);
                request = newRequest;
                parent = module;
            }
        }
        return moduleLoad(request, parent, isMain);
    };
}

function stopModuleLoadOverride() {
    Module._load = moduleLoad;
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

        startModuleLoadOverride();

        var start = new Date();
        var init = require(modulePath);

        var loaded = new Date();
        var adapter = init(options);

        stopModuleLoadOverride();

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

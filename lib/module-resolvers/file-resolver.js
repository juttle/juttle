'use strict';

/* eslint-env node */
var _ = require('underscore');
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var logger = require('../logger').getLogger('file-resolver');
var adapters = require('../runtime/adapters');

const ADAPTER_MODULE_SUBDIR = 'juttle';

function search_paths() {
    var env = process.env;
    var paths = [];
    if (env.JUTTLE_MODULE_PATH) {
        paths = paths.concat(env.JUTTLE_MODULE_PATH.split(':'));
    }
    return paths;
}

class FileResolver {
    constructor(options) {
        options = options || {};

        // stdlib is always available
        this._search_paths = [path.join(__dirname, '../stdlib/')];

        this._additional_search_paths = options.search_paths || search_paths();

        // Also add the module root for all adapters.
        this._adapter_roots = [];

        for (let adapter of adapters.list()) {
            // Only consider non built-in adapters that were loaded successfully.
            if (! adapter.builtin && adapter.loaded) {
                let install_path = this._canonicalize(adapter.path);
                let module_root = [path.dirname(install_path), ADAPTER_MODULE_SUBDIR].join(path.sep);

                // Only add the entry to adapter_roots if it exists and is a directory.
                if (fs.existsSync(module_root)) {
                    let stats = fs.statSync(module_root);
                    if (stats.isDirectory()) {
                        this._adapter_roots.push({
                            adapter: adapter.adapter,
                            module_root: module_root
                        });
                    }
                }
            }
        }

        this.resolve = this._resolve.bind(this);
    }

    _is_file(module_path) {
        try {
            var stats = fs.statSync(module_path);
            return stats.isFile();
        } catch (e) {
            return false;
        }
    }

    _read_file(filename, name) {
        if (! this._is_file(filename)) {
            return false;
        }

        try {
            return {
                source: fs.readFileSync(filename, 'utf8'),
                name: (name ? name : filename)
            };
        }
        catch (e) {
            return false;
        }
    }

    _canonicalize(filename) {
        // If the filename is actually a directory, add a
        // /index.juttle
        if (fs.existsSync(filename)) {
            let stats = fs.statSync(filename);
            if (stats.isDirectory()) {
                filename = path.join(filename, 'index.juttle');
            }
        }

        if (path.extname(filename) !== '.juttle') {
            filename = filename + '.juttle';
        }

        return filename;
    }

    _is_local_import(module_path) {
        return (module_path.startsWith('./') ||
                module_path.startsWith('../') ||
                path.isAbsolute(module_path));
    }

    _search_local_import(module_path, module_name, importer_path) {
        logger.debug(`searching local module_path=${module_path} module_name=${module_name} importer_path=${importer_path}`);

        // Resolve module_path relative to importer_path or the
        // current working directory.
        let dir = process.cwd();
        if (importer_path !== undefined &&
            path.isAbsolute(importer_path)) {
            // importer_path can be non-absolute when the program has
            // a generic name like 'main'. That in turn happens for
            // programs in the cli repl or when provided via -e.

            dir = path.dirname(importer_path);
        }

        // Note this won't change module_path if it is already
        // absolute.
        let filename = path.resolve(dir, module_path);
        filename = this._canonicalize(filename);

        return this._read_file(filename);
    }

    _search_adapter_import(module_path, module_name, importer_path) {

        // Remove the top 'adapters' directory
        let parts = module_path.split('/').slice(1);

        // First see if the module_path matches one of the adapter
        // roots. If it does, prefix the adapter's module root, drop
        // the adapter name from the module path, and try to read the
        // file.
        let first_subdir = parts.shift();

        let root = _.findWhere(this._adapter_roots, {adapter: first_subdir});

        if (root) {
            parts.unshift(root.module_root);
            let filename = this._canonicalize(parts.join(path.sep));
            let module = this._read_file(filename, module_path);
            if (module) {
                return module;
            }
        }

        return false;
    }

    _search_system_import(module_path, module_name, importer_path) {
        logger.debug(`searching system module_path=${module_path} module_name=${module_name} importer_path=${importer_path}`);

        // If the module_path starts with 'adapters' + pathsep, assume
        // it's an adapter module load.
        if (module_path.startsWith('adapters/')) {
            return this._search_adapter_import(module_path, module_name, importer_path);
        }

        var k, paths = this._search_paths;
        paths = paths.concat(this._additional_search_paths);
        for (k = 0; k < paths.length; ++k) {
            var filename = paths[k] + '/' + module_path;

            filename = this._canonicalize(filename);

            let module = this._read_file(filename, module_path);

            if (module) {
                return module;
            }
        }
        return false;
    }

    _resolve(module_path, module_name, importer_path) {
        var found = false;
        if (this._is_local_import(module_path)) {
            found = this._search_local_import(module_path, module_name, importer_path);
        } else {
            found = this._search_system_import(module_path, module_name, importer_path);
        }
        if (found === false) {
            return Promise.reject(new Error('could not find module: ' + module_path));
        }
        return Promise.resolve(found);
    }
}

module.exports = FileResolver;


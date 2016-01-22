'use strict';

/* eslint-env node */
var fs = require('fs');
var path = require('path');
var Promise = require('bluebird');
var Base = require('extendable-base');

function search_paths() {
    var env = process.env;
    var cwd = process.cwd();
    var paths = [ cwd ];
    if (env.JUTTLE_MODULE_PATH) {
        paths = paths.concat(env.JUTTLE_MODULE_PATH.split(':'));
    }
    return paths;
}

var FileResolver = Base.extend({
    initialize: function(options) {
        var self = this;

        options = options || {};

        // stdlib is always available
        self._search_paths = [path.join(__dirname, '../stdlib/')];

        self._additional_search_paths = options.search_paths || search_paths();

        self.resolve = self._resolve.bind(self);
    },

    _is_file: function (module_path) {
        try {
            var stats = fs.statSync(module_path);
            return stats.isFile();
        } catch (e) {
            return false;
        }
    },

    _search: function(module_path) {
        var self = this;

        var k, paths = self._search_paths;
        paths = paths.concat(self._additional_search_paths);
        if (path.extname(module_path) !== '.juttle') {
            module_path = module_path + '.juttle';
        }
        for (k = 0; k < paths.length; ++k) {
            var filename = paths[k] + '/' + module_path;
            if (self._is_file(filename)) {
                try {
                    return fs.readFileSync(filename, 'utf8');
                }
                catch (e) {
                    // continue looking for a module we can successfully load
                }
            }
        }
        return false;
    },

    _resolve: function(module_path) {
        var self = this;

        var src_code = self._search(module_path);
        if (src_code === false) {
            return Promise.reject(new Error('could not find module: ' + module_path));
        }
        return Promise.resolve({ source: src_code, name: module_path});
    }
});

module.exports = FileResolver;


//
// Utility to load and validate the juttle interpreter configuration.
//
// The loader can be given an explicit path (in options.config_path) to a
// configuration file in which case it loads that file directly.
//
// If not it tries to find a valid configuration by checking in the following
// locations (in order):
//
//   <cwd>/.juttle-config.js
//   <cwd>/.juttle-config.json
//   $HOME/.juttle/config.js
//   $HOME/.juttle/config.json
//
// The files are loaded using require(path) so they can be either JSON or
// javascript.
//
var path = require('path');
var fs = require('fs');
var logger = require('../logger').getLogger('config');

function read_config(options) {
    options = options || {};
    if (options.config_path) {
        return read_file(options.config_path);
    } else {
        var paths = [
            path.join(process.cwd(), '.juttle-config.js'),
            path.join(process.cwd(), '.juttle-config.json'),
            path.join(process.env.HOME, '.juttle', 'config.js'),
            path.join(process.env.HOME, '.juttle', 'config.json')
        ];

        for (var i = 0; i < paths.length; ++i) {
            var config_path = paths[i];
            if (fs.existsSync(config_path)) {
                return read_file(config_path);
            }
        }
    }

    return {};
}

function read_file(config_path) {
    try {
        var require_path = path.resolve(process.cwd(), config_path);
        logger.debug('loading', require_path);
        return require(require_path);
    } catch(err) {
        throw Error('Error parsing ' + config_path, err.toString());
    }
}

module.exports = read_config;

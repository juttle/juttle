'use strict';

var Promise = require('bluebird');

module.exports = {
    /*
        Returns a module resolver that attempts to resolve a module name
        using each of the passed in resolvers in series.
        The module resolver returns the first successful resolution.
    */
    multiple: function(resolvers) {
        return function(path, name, importerPath) {
            var num_resolvers = resolvers.length;
            return new Promise(function(resolve, reject) {
                if (resolvers.length === 0 ) {
                    reject('At least 1 resolver must be provided');
                }

                function try_resolver(index) {
                    resolvers[index](path, name, importerPath)
                        .then(function(m) {
                            resolve(m);
                        })
                        .catch(function() {
                            if (index + 1 === num_resolvers) {
                                reject(new Error('Could not find module: ' + path));
                            } else {
                                try_resolver(index + 1);
                            }
                        });
                }

                try_resolver(0);
            });
        };
    }
};

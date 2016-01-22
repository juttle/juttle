'use strict';

var Promise = require('bluebird');
var Base = require('extendable-base');

/* globals global */
global.Promise = Promise;

var fetch = require('isomorphic-fetch');

var URLResolver = Base.extend({

    initialize: function(options) {
        var self = this;

        self.resolve = self._resolve.bind(self);
    },

    _resolve: function(path) {
        if (path.indexOf('http') !== 0) {
            return Promise.reject('Invalid URL: ' + path);
        } else {
            return fetch(path)
                .then(function(response) {
                    if (response.status === 200) {
                        return response.text();
                    } else {
                        throw new Error('Bad response resolving module ' + path + ' got non 200: ' + response.status);
                    }
                })
                .then(function(juttle_code) {
                    return {
                        name: path,
                        source: juttle_code
                    };
                });
        }
    }
});

module.exports = URLResolver;

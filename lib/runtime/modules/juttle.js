'use strict';

/* Implementation of Juttle built-in Juttle module. */

var pkg = require('../../../package.json');
var adapters = require('../adapters');

var Juttle = {
    version: pkg.version,

    adapters: function() {
        return adapters.list();
    }
};

module.exports = Juttle;

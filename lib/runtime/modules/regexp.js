'use strict';

/* Implementation of Juttle built-in RegExp module. */

var errors = require('../errors');
var values = require('../values');

var regexp = {
    toString: function(value) {
        if (!values.isRegExp(value)) {
            throw errors.typeErrorFunction('RegExp.toString', 'regular expression', value);
        }

        return String(value);
    }
};

module.exports = regexp;

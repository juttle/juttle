'use strict';

/* Implementation of Juttle built-in Null module. */

var errors = require('../errors');
var values = require('../values');

var null_ = {
    toString: function(value) {
        if (!values.isNull(value)) {
            throw errors.typeErrorFunction('Null.toString', 'null', value);
        }

        return 'null';
    }
};

module.exports = null_;

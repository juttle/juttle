/* Implementation of Juttle built-in Boolean module. */

var errors = require('../errors');
var values = require('../values');

var boolean = {
    toString: function(value) {
        if (!values.isBoolean(value)) {
            throw errors.typeErrorFunction('Boolean.toString', 'boolean', value);
        }

        return String(value);
    }
};

module.exports = boolean;

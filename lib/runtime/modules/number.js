/* Implementation of Juttle built-in Number module. */

var errors = require('../errors');
var values = require('../values');

var number = {
    fromString: function(value) {
        if (!values.isString(value)) {
            throw errors.typeErrorFunction('Number.fromString', 'string', value);
        }

        return parseFloat(value);
    },
    toString: function(value) {
        if (!values.isNumber(value)) {
            throw errors.typeErrorFunction('Number.toString', 'number', value);
        }

        return String(value);
    }
};

module.exports = number;

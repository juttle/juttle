/* Implementation of Juttle built-in Object module. */

var errors = require('../errors');
var values = require('../values');

var object = {
    keys: function(object) {
        if (!values.isObject(object)) {
            throw errors.typeErrorFunction('Object.keys', 'object', object);
        }

        return Object.keys(object);
    },
};

module.exports = object;

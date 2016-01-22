'use strict';

/* Implementation of Juttle built-in JSON module. */

var errors = require('../errors');
var values = require('../values');

var json = {
    stringify: function(value) {
        return JSON.stringify(values.toJSONCompatible(value));
    },

    parse: function(string) {
        if (!values.isString(string)) {
            throw errors.typeErrorFunction('JSON.parse', 'string', string);
        }

        try {
            return JSON.parse(string);
        } catch (e) {
            throw errors.jsonParseError(e.message, string);
        }
    }
};

module.exports = json;

'use strict';

/* Implementation of Juttle built-in Object module. */

var _ = require('underscore');
var errors = require('../errors');
var values = require('../values');

var object = {
    keys: function(object) {
        if (!values.isObject(object)) {
            throw errors.typeErrorFunction('Object.keys', 'object', object);
        }

        return Object.keys(object);
    },

    toString: function(object) {
        if (!values.isObject(object)) {
            throw errors.typeErrorFunction('Object.toString', 'object', object);
        }

        return values.toString(object);
    },

    values: function(object) {
        if (!values.isObject(object)) {
            throw errors.typeErrorFunction('Object.values', 'object', object);
        }

        return _.values(object);
    }
};

module.exports = object;

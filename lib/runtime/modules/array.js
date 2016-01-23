'use strict';

/* Implementation of Juttle built-in Array module. */

var errors = require('../errors');
var values = require('../values');

var array = {
    length: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.length', 'array', array);
        }

        return array.length;
    },
    indexOf: function(array, searchValue) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.indexOf', 'array', array);
        }

        var index = -1;

        for (var i = 0; i < array.length; i++) {
            if (values.equal(array[i],searchValue)) {
                index = i;
                break;
            }
        }

        return index;
    }
};

module.exports = array;

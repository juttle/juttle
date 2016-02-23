'use strict';

/* Implementation of Juttle built-in Array module. */

var _ = require('underscore');
var errors = require('../errors');
var values = require('../values');

var array = {
    concat: function() {
        _.each(arguments, function(argument) {
            if (!values.isArray(argument)) {
                throw errors.typeErrorFunction('Array.concat', 'array', argument);
            }
        });

        return Array.prototype.concat.apply([], arguments);
    },
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
    },
    join: function(array, joiner) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.join', 'array', array);
        }
        if (!values.isString(joiner)) {
            throw errors.typeErrorFunction('Array.join', 'string', joiner);
        }

        return array.join(joiner);
    },
    lastIndexOf: function(array, searchValue) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.lastIndexOf', 'array', array);
        }

        var index = -1;

        for (var i = array.length - 1; i > 0; i--) {
            if (values.equal(array[i],searchValue)) {
                index = i;
                break;
            }
        }

        return index;
    },
    pop: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.pop', 'array', array);
        }

        return array.length > 0 ? array.pop() : null;
    },
    push: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.push', 'array', array);
        }

        var pushArgs = _.toArray(arguments).slice(1);

        return array.push.apply(array, pushArgs);
    },
    reverse: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.reverse', 'array', array);
        }

        return array.reverse();
    },
    shift: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.shift', 'array', array);
        }

        return array.length > 0 ? array.shift() : null;
    },
    slice: function(array, begin, end) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.slice', 'array', array);
        }
        if (begin !== undefined && !values.isNumber(begin)) {
            throw errors.typeErrorFunction('Array.slice', 'number', begin);
        }
        if (end !== undefined && !values.isNumber(end)) {
            throw errors.typeErrorFunction('Array.slice', 'number', end);
        }

        return array.slice(begin, end);
    },
    sort: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.sort', 'array', array);
        }
        return array.sort(function(a, b) {
            return values.compare(a, b);
        });
    },
    splice: function(array, begin, deleteCount) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.splice', 'array', array);
        }
        if (begin !== undefined && !values.isNumber(begin)) {
            throw errors.typeErrorFunction('Array.splice', 'number', begin);
        }
        if (deleteCount !== undefined && !values.isNumber(deleteCount)) {
            throw errors.typeErrorFunction('Array.splice', 'number', deleteCount);
        }

        var spliceArgs = _.toArray(arguments).slice(1);
        return array.splice.apply(array, spliceArgs);
    },
    toString: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.toString', 'array', array);
        }

        return values.toString(array);
    },
    unshift: function(array) {
        if (!values.isArray(array)) {
            throw errors.typeErrorFunction('Array.unshift', 'array', array);
        }

        var unshiftArgs = _.toArray(arguments).slice(1);

        return array.unshift.apply(array, unshiftArgs);
    },
};

module.exports = array;

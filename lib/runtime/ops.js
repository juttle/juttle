'use strict';

/* Implementation of Juttle operators. */

var errors = require('./errors');
var juttleErrors = require('../errors');
var gex = require('gex');
var JuttleMoment = require('../runtime/types/juttle-moment');
var values = require('./values');


function doGet(object, index) {
    if (Object.prototype.hasOwnProperty.call(object, index)) {
        return object[index];
    } else {
        return null;
    }
}

var ops = {
    str: function(value) {
        return values.toString(value);
    },

    add: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left + right;
        } else if (values.isString(left) && values.isString(right)) {
            return left + right;
        } else if (values.isDate(left) && values.isDuration(right)) {
            return JuttleMoment.add(left, right);
        } else if (values.isDuration(left) && values.isDate(right)) {
            return JuttleMoment.add(left, right);
        } else if (values.isDuration(left) && values.isDuration(right)) {
            return JuttleMoment.add(left, right);
        } else {
            throw errors.typeErrorBinary('+', left, right);
        }
    },

    sub: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left - right;
        } else if (values.isDate(left) && values.isDate(right)) {
            return JuttleMoment.subtract(left, right);
        } else if (values.isDate(left) && values.isDuration(right)) {
            return JuttleMoment.subtract(left, right);
        } else if (values.isDuration(left) && values.isDuration(right)) {
            return JuttleMoment.subtract(left, right);
        } else {
            throw errors.typeErrorBinary('-', left, right);
        }
    },

    mul: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left * right;
        } else if (values.isNumber(left) && values.isDuration(right)) {
            return JuttleMoment.multiply(left, right);
        } else if (values.isDuration(left) && values.isNumber(right)) {
            return JuttleMoment.multiply(left, right);
        } else {
            throw errors.typeErrorBinary('*', left, right);
        }
    },

    div: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left / right;
        } else if (values.isDuration(left) && values.isNumber(right)) {
            return JuttleMoment.divide(left, right);
        } else if (values.isDuration(left) && values.isDuration(right)) {
            return JuttleMoment.divide(left, right);
        } else {
            throw errors.typeErrorBinary('/', left, right);
        }
    },

    mod: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left % right;
        } else if (values.isDuration(left) && values.isDuration(right)) {
            return JuttleMoment.remainder(left, right);
        } else {
            throw errors.typeErrorBinary('%', left, right);
        }
    },

    pos: function(value) {
        if (values.isNumber(value)) {
            return value;
        } if (values.isDuration(value)) {
            return value;
        } else  {
            throw errors.typeErrorUnary('+', value);
        }
    },

    neg: function(value) {
        if (values.isNumber(value)) {
            return -value;
        } else if (values.isDuration(value)) {
            return JuttleMoment.negate(value);
        } else  {
            throw errors.typeErrorUnary('-', value);
        }
    },

    band: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left & right;
        } else {
            throw errors.typeErrorBinary('&', left, right);
        }
    },

    bor: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left | right;
        } else {
            throw errors.typeErrorBinary('|', left, right);
        }
    },

    bxor: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left ^ right;
        } else {
            throw errors.typeErrorBinary('^', left, right);
        }
    },

    bnot: function(value) {
        if (values.isNumber(value)) {
            return ~value;
        } else  {
            throw errors.typeErrorUnary('~', value);
        }
    },

    shl: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left << right;
        } else {
            throw errors.typeErrorBinary('<<', left, right);
        }
    },

    shr: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left >> right;
        } else {
            throw errors.typeErrorBinary('>>', left, right);
        }
    },

    shrz: function(left, right) {
        if (values.isNumber(left) && values.isNumber(right)) {
            return left >>> right;
        } else {
            throw errors.typeErrorBinary('>>>', left, right);
        }
    },

    eql: function(left, right) {
        return values.equal(left, right);
    },

    neq: function(left, right) {
        return !values.equal(left, right);
    },

    match: function(left, right) {
        if (values.isString(right)) {
            if (values.isString(left)) {
                var escapedRight = right.replace(/\\\*/g, '**').replace(/\\\?/g, '*?');
                return gex(escapedRight).on(left) !== null ? true : false;
            } else {
                return false;
            }
        } else if (values.isRegExp(right)) {
            if (values.isString(left)) {
                return right.test(left);
            } else {
                return false;
            }
        } else {
            throw errors.typeErrorBinary('=~', left, right);
        }
    },

    nmatch: function(left, right) {
        if (values.isString(right)) {
            if (values.isString(left)) {
                var escapedRight = right.replace(/\\\*/g, '**').replace(/\\\?/g, '*?');
                return gex(escapedRight).on(left) === null ? true : false;
            } else {
                return true;
            }
        } else if (values.isRegExp(right)) {
            if (values.isString(left)) {
                return !right.test(left);
            } else {
                return true;
            }
        } else {
            throw errors.typeErrorBinary('!~', left, right);
        }
    },

    lt: function(left, right) {
        try {
            return values.compare(left, right) < 0;
        } catch (e) {
            throw errors.typeErrorBinary('<', left, right);
        }
    },

    gt: function(left, right) {
        try {
            return values.compare(left, right) > 0;
        } catch (e) {
            throw errors.typeErrorBinary('>', left, right);
        }
    },

    lte: function(left, right) {
        try {
            return values.compare(left, right) <= 0;
        } catch (e) {
            throw errors.typeErrorBinary('<=', left, right);
        }
    },

    gte: function(left, right) {
        try {
            return values.compare(left, right) >= 0;
        } catch (e) {
            throw errors.typeErrorBinary('>=', left, right);
        }
    },

    in: function(left, right) {
        if (values.isArray(right)) {
            return right.some(function(e) { return values.equal(left, e); });
        } else {
            throw errors.typeErrorBinary('in', left, right);
        }
    },

    land: function(left, right) {
        if (values.isBoolean(left) && values.isBoolean(right)) {
            return left && right;
        } else {
            throw errors.typeErrorBinary('AND', left, right);
        }
    },

    lor: function(left, right) {
        if (values.isBoolean(left) && values.isBoolean(right)) {
            return left || right;
        } else {
            throw errors.typeErrorBinary('OR', left, right);
        }
    },

    lnot: function(value) {
        if (values.isBoolean(value)) {
            return !value;
        } else  {
            throw errors.typeErrorUnary('NOT', value);
        }
    },

    coal: function(left, right) {
        return !values.isNull(left) ? left : right;
    },

    get: function(object, index) {
        if (values.isString(object) && values.isNumber(index)) {
            return doGet(object, index);
        } else if (values.isArray(object) && values.isNumber(index)) {
            return doGet(object, index);
        } else if (values.isObject(object) && values.isString(index)) {
            return doGet(object, index);
        } else {
            throw errors.typeErrorGet(object, index);
        }
    },

    pget: function(point, index) {
        return doGet(point, index);
    },

    call: function(fn) {
        var args = Array.prototype.slice.call(arguments, 1);

        return juttleErrors.locate(function() {
            return fn.apply(null, args);
        }, fn.location);
    }
};

module.exports = ops;

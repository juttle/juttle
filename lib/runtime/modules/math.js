'use strict';

// Implementation of Juttle built-in Math module.

var _ = require('underscore');
var errors = require('../errors');
var values = require('../values');
var seedrandom = require('seedrandom');
var round = require('./decimal-round');

function wrapMathFunction(name) {
    return function() {
        _.each(arguments, function(arg) {
            if (!values.isNumber(arg)) {
                throw errors.typeErrorFunction('Math.' + name, 'number', arg);
            }
        });

        return Math[name].apply(Math, Array.prototype.slice.call(arguments, 0));
    };
}

function wrapRoundFunction(name) {
    return function(value, digits) {
        if (!values.isNumber(value)) {
            throw errors.typeErrorFunction('Math.' + name, 'number', value);
        }
        if (digits !== undefined && !values.isNumber(digits)) {
            throw errors.typeErrorFunction('Math.' + name, 'number', digits);
        }
        return round[name + '10'](value, digits ? -digits : digits);
    };
}

var _random = Math.random; // juttle's global RNG

var seed = function(seed) {
    if (!values.isNumber(seed)) {
        throw errors.typeErrorFunction('Math.seed', 'number', seed);
    }
    _random = seedrandom(seed);
    return null;
};

var math = {
    abs:    wrapMathFunction('abs'),
    acos:   wrapMathFunction('acos'),
    asin:   wrapMathFunction('asin'),
    atan:   wrapMathFunction('atan'),
    atan2:  wrapMathFunction('atan2'),
    ceil:   wrapRoundFunction('ceil'),
    cos:    wrapMathFunction('cos'),
    exp:    wrapMathFunction('exp'),
    floor:  wrapRoundFunction('floor'),
    log:    wrapMathFunction('log'),
    max:    wrapMathFunction('max'),
    min:    wrapMathFunction('min'),
    pow:    wrapMathFunction('pow'),
    random: function() { return _random(); },
    round:  wrapRoundFunction('round'),
    sin:    wrapMathFunction('sin'),
    seed:   seed,
    sqrt:   wrapMathFunction('sqrt'),
    tan:    wrapMathFunction('tan')
};

module.exports = math;

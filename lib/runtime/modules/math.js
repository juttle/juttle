// Implementation of Juttle built-in Math module.

var _ = require('underscore');
var errors = require('../errors');
var values = require('../values');
var seedrandom = require('seedrandom');

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
    ceil:   wrapMathFunction('ceil'),
    cos:    wrapMathFunction('cos'),
    exp:    wrapMathFunction('exp'),
    floor:  wrapMathFunction('floor'),
    log:    wrapMathFunction('log'),
    max:    wrapMathFunction('max'),
    min:    wrapMathFunction('min'),
    pow:    wrapMathFunction('pow'),
    random: function() { return _random(); },
    round:  wrapMathFunction('round'),
    sin:    wrapMathFunction('sin'),
    seed:   seed,
    sqrt:   wrapMathFunction('sqrt'),
    tan:    wrapMathFunction('tan')
};

module.exports = math;

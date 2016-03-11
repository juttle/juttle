'use strict';

var _ = require('underscore');
var BaseInput = require('./base-input');

const DEFAULT_VALUE = 0;

class NumberInput extends BaseInput {
    constructor(id, options) {
        super('number', id, options);
    }

    getInputDefaultValue() {
        return DEFAULT_VALUE;
    }

    normalizeValue(value) {
        if (_.isNumber(value)) {
            return value;
        }

        throw new Error('invalid input value');
    }
}

module.exports = NumberInput;

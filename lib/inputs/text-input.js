'use strict';

var _ = require('underscore');
var BaseInput = require('./base-input');

const DEFAULT_VALUE = '';

class TextInput extends BaseInput {
    constructor(id, options) {
        super('text', id, options);
    }

    getInputDefaultValue() {
        return DEFAULT_VALUE;
    }

    normalizeValue(value) {
        if (_.isString(value)) {
            return value;
        } else if (_.isNumber(value)) {
            return value.toString();
        }

        throw new Error('invalid input value');
    }
}

module.exports = TextInput;

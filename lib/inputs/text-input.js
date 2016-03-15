'use strict';

var _ = require('underscore');
var BaseInput = require('./base-input');
var errors = require('../errors');

const DEFAULT_VALUE = '';

class TextInput extends BaseInput {
    constructor(id, params) {
        super('text', id, params);
    }

    getInputDefaultValue() {
        return DEFAULT_VALUE;
    }

    normalizeParams(params) {
        if (params.default) {
            try {
                params = Object.assign({}, params, {
                    default: this.normalizeValue(params.default)
                });
            } catch (err) {
                if (!(err instanceof errors.CompileError)) {
                    throw err;
                }

                throw errors.compileError('INPUT-INVALID-PARAM', {
                    input_id: this.id,
                    param: 'default',
                    param_value: params.default,
                    message: err.message
                });
            }
        }

        return params;
    }

    normalizeValue(value) {
        if (_.isString(value)) {
            return value;
        } else if (_.isNumber(value)) {
            return value.toString();
        }

        throw errors.compileError('INPUT-INVALID-VALUE', {
            input_id: this.id,
            value: value,
            message: 'Value must be either a string or number'
        });
    }
}

module.exports = TextInput;

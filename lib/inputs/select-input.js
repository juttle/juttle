'use strict';

var _ = require('underscore');
var BaseInput = require('./base-input');
var errors = require('../errors');

class SelectInput extends BaseInput {
    constructor(id, params) {
        super('select', id, params);
    }

    getInputDefaultValue() {
        return this.params.items[0].value;
    }

    normalizeParams(params) {
        params = Object.assign({}, params);

        if (!params.items) {
            throw errors.compileError('INPUT-REQ-PARAMS-MISSING', {
                input_id: this.id,
                missing_params: 'items'
            });
        }

        if (!_.isArray(params.items)) {
            throw errors.compileError('INPUT-INVALID-PARAM', {
                input_id: this.id,
                param: 'items',
                param_value: params.items,
                message: 'Item param must be an array'
            });
        }

        params.items = params.items.map((item) => {
            // if value is string, number or array expand to obj with value and label
            if (_.isString(item) || _.isNumber(item) || _.isArray(item)) {
                return { value: item, label: item.toString() };
            }

            if (!item.value || !item.label) {
                throw errors.compileError('INPUT-INVALID-PARAM', {
                    input_id: this.id,
                    param: 'items',
                    param_value: params.items,
                    message: 'All object item options must have a value and label attribute.'
                });
            }

            return item;
        });

        if (params.default) {
            try {
                params = Object.assign({}, params, {
                    default: this.normalizeValue(params.default, params.items)
                });
            } catch (err) {
                if (!(err instanceof errors.CompileError)) throw err;

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

    normalizeValue(value, items) {
        items = items || this.params.items;

        let retrievedValue = _.find(items, (item) => {
            return _.isEqual(value, item.value);
        });

        if (!retrievedValue) {
            throw errors.compileError('INPUT-INVALID-VALUE', {
                input_id: this.id,
                value: value,
                message: 'Value must be a member of -items'
            });
        }

        return retrievedValue.value;
    }
}

module.exports = SelectInput;

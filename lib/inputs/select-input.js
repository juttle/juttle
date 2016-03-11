'use strict';

var _ = require('underscore');
var BaseInput = require('./base-input');

class SelectInput extends BaseInput {
    constructor(id, options) {
        super('select', id, options);
    }

    getInputDefaultValue() {
        return this.options.items[0].value;
    }

    normalizeOptions(options) {
        options = Object.assign({}, options) || {};

        if (!options.items || !_.isArray(options.items)) {
            throw new Error('invalid options');
        }

        options.items = options.items.map((item) => {
            return _.isString(item) ? { value: item, label: item } : item;
        });

        return options;
    }

    normalizeValue(value) {
        let retrievedValue = _.findWhere(this.options.items, { value });

        if (!retrievedValue) {
            throw new Error('invalid value');
        }

        return retrievedValue.value;
    }
}

module.exports = SelectInput;

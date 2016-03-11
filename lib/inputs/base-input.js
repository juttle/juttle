'use strict';

class BaseInput {
    constructor(type, id, options, inputDefaultValue) {
        this.type = type;
        this.id = id;
        this.options = this.normalizeOptions(options);

        this.value = this.options.default ? this.normalizeValue(this.options.default) : this.getInputDefaultValue();
    }

    getInputDefaultValue() {
        throw new Error('getInputDefaultValue must be implemented');
    }

    normalizeOptions(options) {
        return options || {};
    }

    normalizeValue() {
        throw new Error('normalizeValue must be implemented');
    }

    setValue(value) {
        this.value = this.normalizeValue(value);
    }

    toObj() {
        return {
            id: this.id,
            type: this.type,
            value: this.value,
            options: this.options
        };
    }
}

module.exports = BaseInput;

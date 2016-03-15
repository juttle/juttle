'use strict';

class BaseInput {
    constructor(type, id, params, inputDefaultValue) {
        this.type = type;
        this.id = id;
        this.params = this.normalizeParams(params || {});

        this.value = this.params.default || this.getInputDefaultValue();
    }

    getInputDefaultValue() {
        throw new Error('getInputDefaultValue must be implemented');
    }

    normalizeParams(params) {
        return params || {};
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
            params: this.params
        };
    }
}

module.exports = BaseInput;

'use strict';

// Represents a filter expression in Jutttle runtime.
class Filter {
    constructor(ast, source) {
        this.ast = ast;
        this.source = source;
    }
}

Filter.PASS_ALL = new Filter({ type: 'BooleanLiteral', value: true }, 'true');
Filter.PASS_NONE = new Filter({ type: 'BooleanLiteral', value: false }, 'false');

module.exports = Filter;

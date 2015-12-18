var Base = require('extendable-base');

// Represents a filter expression in Jutttle runtime.
var Filter = Base.extend({
    constructor: function(ast, text) {
        this.ast = ast;
        this.text = text;
    }
});

Filter.PASS_ALL = new Filter({ type: "BooleanLiteral", value: true }, 'true');
Filter.PASS_NONE = new Filter({ type: "BooleanLiteral", value: false }, 'false');

module.exports = Filter;

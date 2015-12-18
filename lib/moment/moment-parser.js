var Base = require('extendable-base');
var parser = require('./parser');

var MomentParser = Base.extend({

    initialize: function(options) {
        options = options || {};
        this.debug = !!options.debug;
    },

    parse: function(source) {
        var ast = parser.parse(source);
        return ast;
    }
});

module.exports = {
    MomentParser: MomentParser,
    SyntaxError: parser.SyntaxError
};

var _ = require('underscore');
var Base = require('extendable-base');

var CodeGenerator = Base.extend({
    gen_ArrayLiteral: function(ast) {
        var self = this;
        var exprs = _.map(ast.elements, function(element) {
            return self.gen_expr(element);
        } );
        return "[" + exprs.join(",") + "]";
    },
    gen_NumericLiteral: function(ast) {
        return ast.value.toString();
    },
    gen_InfinityLiteral: function(ast) {
        return (ast.negative ? '-' : '') + 'Infinity';
    },
    gen_NaNLiteral: function() {
        return 'NaN';
    },
    gen_BooleanLiteral: function(ast) {
        return JSON.stringify(ast.value);
    },
    gen_StringLiteral: function(ast) {
        return JSON.stringify(ast.value);
    },
    gen_MultipartStringLiteral: function(ast) {
        var self = this;
        var exprs = _.map(ast.parts, function(part) {
            return self.gen_expr(part);
        });
        return "(" + exprs.join(" + ") + ")";
    },
    gen_NullLiteral: function() {
        return 'null';
    },
    gen_RegularExpressionLiteral: function(ast) {
        return '/'+ ast.value +'/'+ ast.flags;
    },
    gen_ObjectLiteral: function(ast) {
        var self = this;
        var simple = _(ast.properties).any(function(property) {
            return property.key.type === 'StringLiteral';
        });
        var props = _(ast.properties).map(function(property) {
            return self.gen_ObjectProperty(property, simple);
        });

        return simple
            ? '{' + props.join(', ') + '}'
            : 'juttle.values.buildObject([' + props.join(', ') + '])';
    },
    gen_ObjectProperty: function(ast, simple) {
        return simple
            ? this.gen_expr(ast.key) + ': ' + this.gen_expr(ast.value)
            : '[' + this.gen_expr(ast.key) + ', ' + this.gen_expr(ast.value) + ']';
    },
    gen_DurationConstant: function(ast) {
        return 'new JuttleMoment.duration("' + ast.value + '")';
    },
    gen_MomentConstant: function(ast) {
        return 'new JuttleMoment("' + ast.value + '")';
    },
    gen_FilterLiteral: function(ast) {
        return 'new Filter(' + JSON.stringify(ast.ast) + ',' + JSON.stringify(ast.text) + ')';
    },
    gen_ToString: function(ast) {
        return 'juttle.ops.str(' + this.gen_expr(ast.expression) + ')';
    },
});


module.exports = CodeGenerator;

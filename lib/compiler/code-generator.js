'use strict';

var _ = require('underscore');
class CodeGenerator {
    gen_ArrayLiteral(ast) {
        var self = this;
        var exprs = _.map(ast.elements, function(element) {
            return self.gen_expr(element);
        } );
        return '[' + exprs.join(',') + ']';
    }
    gen_NumberLiteral(ast) {
        return ast.value.toString();
    }
    gen_InfinityLiteral(ast) {
        return (ast.negative ? '-' : '') + 'Infinity';
    }
    gen_NaNLiteral() {
        return 'NaN';
    }
    gen_BooleanLiteral(ast) {
        return JSON.stringify(ast.value);
    }
    gen_StringLiteral(ast) {
        return JSON.stringify(ast.value);
    }
    gen_MultipartStringLiteral(ast) {
        var self = this;
        var exprs = _.map(ast.parts, function(part) {
            return self.gen_expr(part);
        });
        return '(' + exprs.join(' + ') + ')';
    }
    gen_NullLiteral() {
        return 'null';
    }
    gen_RegExpLiteral(ast) {
        return '/'+ ast.pattern +'/'+ ast.flags;
    }
    gen_ObjectLiteral(ast) {
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
    }
    gen_ObjectProperty(ast, simple) {
        return simple
            ? this.gen_expr(ast.key) + ': ' + this.gen_expr(ast.value)
            : '[' + this.gen_expr(ast.key) + ', ' + this.gen_expr(ast.value) + ']';
    }
    gen_DurationLiteral(ast) {
        return 'juttle.types.JuttleMoment.duration("' + ast.value + '")';
    }
    gen_MomentLiteral(ast) {
        return 'new juttle.types.JuttleMoment("' + ast.value + '")';
    }
    gen_FilterLiteral(ast) {
        return 'new juttle.types.Filter(' + JSON.stringify(ast.ast) + ',' + JSON.stringify(ast.source) + ')';
    }
    gen_ToString(ast) {
        return 'juttle.ops.str(' + this.gen_expr(ast.expression) + ')';
    }
}


module.exports = CodeGenerator;

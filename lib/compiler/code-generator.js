'use strict';

var _ = require('underscore');
class CodeGenerator {
    gen_ArrayLiteral(node) {
        var self = this;
        var exprs = _.map(node.elements, function(element) {
            return self.gen_expr(element);
        } );
        return '[' + exprs.join(',') + ']';
    }
    gen_NumberLiteral(node) {
        return node.value.toString();
    }
    gen_InfinityLiteral(node) {
        return (node.negative ? '-' : '') + 'Infinity';
    }
    gen_NaNLiteral() {
        return 'NaN';
    }
    gen_BooleanLiteral(node) {
        return JSON.stringify(node.value);
    }
    gen_StringLiteral(node) {
        return JSON.stringify(node.value);
    }
    gen_MultipartStringLiteral(node) {
        var self = this;
        var exprs = _.map(node.parts, function(part) {
            return self.gen_expr(part);
        });
        return '(' + exprs.join(' + ') + ')';
    }
    gen_NullLiteral() {
        return 'null';
    }
    gen_RegExpLiteral(node) {
        return '/'+ node.pattern +'/'+ node.flags;
    }
    gen_ObjectLiteral(node) {
        var self = this;
        var simple = _(node.properties).any(function(property) {
            return property.key.type === 'StringLiteral';
        });
        var props = _(node.properties).map(function(property) {
            return self.gen_ObjectProperty(property, simple);
        });

        return simple
            ? '{' + props.join(', ') + '}'
            : 'juttle.values.buildObject([' + props.join(', ') + '])';
    }
    gen_ObjectProperty(node, simple) {
        return simple
            ? this.gen_expr(node.key) + ': ' + this.gen_expr(node.value)
            : '[' + this.gen_expr(node.key) + ', ' + this.gen_expr(node.value) + ']';
    }
    gen_DurationLiteral(node) {
        return 'juttle.types.JuttleMoment.duration("' + node.value + '")';
    }
    gen_MomentLiteral(node) {
        return 'new juttle.types.JuttleMoment("' + node.value + '")';
    }
    gen_FilterLiteral(node) {
        return 'new juttle.types.Filter(' + JSON.stringify(node.node) + ',' + JSON.stringify(node.source) + ')';
    }
    gen_ToString(node) {
        return 'juttle.ops.str(' + this.gen_expr(node.expression) + ')';
    }
}


module.exports = CodeGenerator;

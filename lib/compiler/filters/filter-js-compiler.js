'use strict';

// Compiler that transforms filter expression AST into a code of a JavaScript
// function that implements the filter.
//
// The function code is returned as the return value of the "compile" function.
// The compiler doesn't modify the AST.

var ASTVisitor = require('../ast-visitor');
var _ = require('underscore');
var errors = require('../../errors');

var UNARY_OPS_TO_FUNCTIONS = {
    '+':   'pos',
    '-':   'neg',
    '~':   'bnot',
    'NOT': 'lnot'
};

var BINARY_OPS_TO_FUNCTIONS = {
    '+':   'add',
    '-':   'sub',
    '*':   'mul',
    '/':   'div',
    '%':   'mod',
    '&':   'band',
    '|':   'bor',
    '^':   'bxor',
    '<<':  'shl',
    '>>':  'shr',
    '>>>': 'shrz',
    '==':  'eql',
    '!=':  'neq',
    '=~':  'match',
    '!~':  'nmatch',
    '<':   'lt',
    '>':   'gt',
    '<=':  'lte',
    '>=':  'gte',
    'in':  'in',
    'AND': 'land',
    'OR':  'lor',
    '??':  'coal'
};

class FilterJSCompiler extends ASTVisitor {
    compile(node) {
        return '(function(pt) { return ' + this.visit(node) + ' })';
    }

    visitNullLiteral(node) {
        return 'null';
    }

    visitBooleanLiteral(node) {
        return String(node.value);
    }

    visitNumberLiteral(node) {
        return String(node.value);
    }

    visitInfinityLiteral(node) {
        return (node.negative ? '-' : '') + 'Infinity';
    }

    visitNaNLiteral(node) {
        return 'NaN';
    }

    visitStringLiteral(node) {
        return JSON.stringify(node.value);
    }

    visitMultipartStringLiteral(node) {
        return '(' + _.map(node.parts, this.visit, this).join(' + ') + ')';
    }

    visitRegExpLiteral(node) {
        return 'new RegExp(' + JSON.stringify(node.pattern) + ', ' + JSON.stringify(node.flags) + ')';
    }

    visitMomentLiteral(node) {
        return 'new juttle.types.JuttleMoment(' + JSON.stringify(node.value) + ')';
    }

    visitDurationLiteral(node) {
        return 'juttle.types.JuttleMoment.duration(' + JSON.stringify(node.value) + ')';
    }

    visitFilterLiteral(node) {
        return this.visit(node.ast);
    }

    visitArrayLiteral(node) {
        return '[ ' + _.map(node.elements, this.visit, this).join(', ') + ' ]';
    }

    visitObjectLiteral(node) {
        var self = this;

        var hasSimpleKeys = _.every(node.properties, function(property) {
            return property.key.type === 'StringLiteral'
                || property.key.type === 'NumberLiteral';
        });

        var propertiesCode = _.map(node.properties, function(property) {
            return self.visit(property, hasSimpleKeys);
        }).join(', ');

        return hasSimpleKeys
            ? '{ ' + propertiesCode + ' }'
            : 'juttle.values.buildObject([ ' + propertiesCode + ' ])';
    }

    visitObjectProperty(node, hasSimpleKeys) {
        return hasSimpleKeys
            ? this.visit(node.key) + ': ' + this.visit(node.value)
            : '[' + this.visit(node.key) + ', ' + this.visit(node.value) + ']';
    }

    visitField(node) {
        return 'juttle.ops.pget(pt, ' + JSON.stringify(node.name) + ')';
    }

    visitToString(node) {
        return 'juttle.ops.str(' + this.visit(node.expression) + ')';
    }

    visitMemberExpression(node) {
        if (!node.computed) {
            return node.uname;
        } else {
            return 'juttle.ops.get('
                + this.visit(node.object)
                + ', '
                + this.visit(node.property)
                + ')';
        }
    }

    visitCallExpression(node) {
        return  'juttle.ops.call('
            + node.fname
            + ', '
            + _.map(node.arguments, this.visit, this).join(', ')
            + ')';
    }

    visitUnaryExpression(node) {
        switch (node.operator) {
            case '*':
                return 'juttle.ops.pget(pt, ' + this.visit(node.argument) + ')';

            case '!':
                return '!juttle.values.ensureBoolean('
                    + this.visit(node.argument)
                    + ', '
                    + '\'"!" operator: Invalid operand type (<type>).\''
                    + ')';

            default:
                return 'juttle.ops.' + UNARY_OPS_TO_FUNCTIONS[node.operator] + '('
                    + this.visit(node.argument)
                    + ')';
        }
    }

    visitBinaryExpression(node) {
        switch (node.operator) {
            case '&&':
            case '||':
                return 'juttle.values.ensureBoolean('
                    + this.visit(node.left)
                    + ', '
                    + '\'"' + node.operator + '" operator: Invalid operand type (<type>).\''
                    + ')'
                    + ' ' + node.operator + ' '
                    + 'juttle.values.ensureBoolean('
                    + this.visit(node.right)
                    + ', '
                    + '\'"' + node.operator + '" operator: Invalid operand type (<type>).\''
                    + ')';

            default:
                return 'juttle.ops.' + BINARY_OPS_TO_FUNCTIONS[node.operator] + '('
                    + this.visit(node.left)
                    + ', '
                    + this.visit(node.right)
                    + ')';
        }
    }

    visitConditionalExpression(node) {
        return 'juttle.values.ensureBoolean('
            + this.visit(node.condition)
            + ', '
            + '\'Ternary operator: Invalid operand type (<type>).\''
            + ')'
            + ' ? '
            + this.visit(node.trueExpression)
            + ' : '
            + this.visit(node.falseExpression);
    }

    visitExpressionFilterTerm(node) {
        return this.visit(node.expression);
    }

    visitSimpleFilterTerm(node) {
        switch (node.expression.type) {
            case 'StringLiteral':
                throw errors.compileError('NO-FREE-TEXT');

            case 'FilterLiteral':
                return this.visit(node.expression);

            default:
                throw new Error('Invalid node type: ' + node.expression.type + '.');
        }
    }
}

module.exports = FilterJSCompiler;

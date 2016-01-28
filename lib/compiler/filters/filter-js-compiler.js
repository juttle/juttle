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

var FilterJSCompiler = ASTVisitor.extend({
    compile: function(node) {
        return '(function(pt) { return ' + this.visit(node) + ' })';
    },

    visitNullLiteral: function(node) {
        return 'null';
    },

    visitBooleanLiteral: function(node) {
        return String(node.value);
    },

    visitNumericLiteral: function(node) {
        return String(node.value);
    },

    visitInfinityLiteral: function(node) {
        return (node.negative ? '-' : '') + 'Infinity';
    },

    visitNaNLiteral: function(node) {
        return 'NaN';
    },

    visitStringLiteral: function(node) {
        return JSON.stringify(node.value);
    },

    visitMultipartStringLiteral: function(node) {
        return '(' + _.map(node.parts, this.visit, this).join(' + ') + ')';
    },

    visitRegularExpressionLiteral: function(node) {
        return 'new RegExp(' + JSON.stringify(node.value) + ', ' + JSON.stringify(node.flags) + ')';
    },

    visitMomentLiteral: function(node) {
        return 'new JuttleMoment(' + JSON.stringify(node.value) + ')';
    },

    visitDurationLiteral: function(node) {
        return 'JuttleMoment.duration(' + JSON.stringify(node.value) + ')';
    },

    visitFilterLiteral: function(node) {
        return this.visit(node.ast);
    },

    visitArrayLiteral: function(node) {
        return '[ ' + _.map(node.elements, this.visit, this).join(', ') + ' ]';
    },

    visitToString: function(node) {
        return 'juttle.ops.str(' + this.visit(node.expression) + ')';
    },

    visitUnaryExpression: function(node) {
        switch (node.operator) {
            case '*':
                return 'juttle.ops.pget(pt, ' + this.visit(node.expression) + ')';

            case '!':
                return '!juttle.values.ensureBoolean('
                    + this.visit(node.expression)
                    + ', '
                    + '\'"!" operator: Invalid operand type (<type>).\''
                    + ')';

            default:
                return 'juttle.ops.' + UNARY_OPS_TO_FUNCTIONS[node.operator] + '('
                    + this.visit(node.expression)
                    + ')';
        }
    },

    visitBinaryExpression: function(node) {
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
    },

    visitExpressionFilterTerm: function(node) {
        return this.visit(node.expression);
    },

    visitSimpleFilterTerm: function(node) {
        switch (node.expression.type) {
            case 'StringLiteral':
                throw errors.compileError('RT-NO-FREE-TEXT');

            case 'FilterLiteral':
                return this.visit(node.expression);

            default:
                throw new Error('Invalid node type: ' + node.expression.type + '.');
        }
    }
});

module.exports = FilterJSCompiler;

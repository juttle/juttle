// Compiler that transforms filter expression AST into a code of a JavaScript
// function that implements the filter.
//
// The function code is returned as the return value of the "compile" function.
// The compiler doesn't modify the AST.

var ASTVisitor = require('../ast-visitor');
var errors = require('../../errors');

var BINARY_OPS_TO_FUNCTIONS = {
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
    'OR':  'lor'
};

var FilterJSCompiler = ASTVisitor.extend({
    compile: function(node) {
        return '(function(pt) { return ' + this.visit(node) + ' })';
    },

    visitNullLiteral: function(node) {
        return "null";
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

    visitRegularExpressionLiteral: function(node) {
        return 'new RegExp(' + JSON.stringify(node.value) + ', ' + JSON.stringify(node.flags) + ')';
    },

    visitMomentConstant: function(node) {
        return 'new JuttleMoment(' + JSON.stringify(node.value) + ')';
    },

    visitDurationConstant: function(node) {
        return 'JuttleMoment.duration(' + JSON.stringify(node.value) + ')';
    },

    visitFilterLiteral: function(node) {
        return this.visit(node.ast);
    },

    visitArrayLiteral: function(node) {
        var self = this;

        return '[' + node.elements.map(function(e) { return self.visit(e); }).join(', ') + ']';
    },

    visitUnaryExpression: function(node) {
        switch (node.operator) {
            case 'NOT':
                return 'juttle.ops.lnot(' + this.visit(node.expression) + ')';

            case '*':
                return 'juttle.ops.pget(pt, ' + this.visit(node.expression) + ')';

            default:
                throw new Error('Invalid operator: ' + node.operator + '.');
        }
    },

    visitBinaryExpression: function(node) {
        return 'juttle.ops.' + BINARY_OPS_TO_FUNCTIONS[node.operator] + '('
            + this.visit(node.left) + ', '
            + this.visit(node.right)
            + ')';
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

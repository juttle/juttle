// Inspects filter expression AST and throws an error if it contains values of
// invalid types.
//
// For normal expressions, these checks are done in runtime, but for filter
// expressions at least some basic checks need to be done sooner so that the ES
// and JS compilers can assume some level of sanity. Note we already have all
// the values computed when the checker is invoked in the graph compilation
// stage because we don't allow straming expressions inside filter expressions.
//
// Some structural checks on filter expressions are done in the semantic pass
// already (the idea is to do them as soon as possible in the compiler
// pipeline).

var ASTVisitor = require('../ast-visitor');
var SemanticPass = require('../semantic');
var errors = require('../../errors');

var NODE_TYPE_DISPLAY_NAMES = {
    NullLiteral:              'null',
    BooleanLiteral:           'boolean',
    NumericLiteral:           'number',
    InfinityLiteral:          'number',
    NaNLiteral:               'number',
    StringLiteral:            'string',
    RegularExpressionLiteral: 'regular expression',
    MomentLiteral:            'date',
    DurationLiteral:          'duration',
    FilterLiteral:            'filter expression',
    ArrayLiteral:             'array',
    ObjectLiteral:            'object'
};

var FilterChecker = ASTVisitor.extend({
    check: function(node, options) {
        this.options = options;

        this.visit(node);
    },

    visitFilterLiteral: function(node) {
        // This is somewhat ugly becasue the semantic pass modifies the AST
        // which the checker generally avoids. May be worth extracting into a
        // separate pass later.
        var semantic = new SemanticPass({ now: this.options.now });
        node.ast = semantic.sa_expr(node.ast);
        this.visit(node.ast);
    },

    visitExpressionFilterTerm: function(node) {
        var expression = node.expression;

        if (this._isSimpleFieldReference(expression.left) && this._isSimpleFieldReference(expression.right)) {
            if (this.options.allowFieldComparisons) {
                this._checkFieldNode(expression.left, expression.location);
                this._checkFieldNode(expression.right, expression.location);
            } else {
                throw new Error('At least one operand must not be a field reference.');
            }
        } else if (this._isSimpleFieldReference(expression.left)) {
            this._checkFieldNode(expression.left, expression.location);
            this._checkValueNode(expression.right, expression.operator, expression.location);
        } else if (this._isSimpleFieldReference(expression.right)) {
            this._checkValueNode(expression.left, expression.operator, expression.location);
            this._checkFieldNode(expression.right, expression.location);
        } else {
            throw new Error('At least one operand must be a field reference.');
        }
    },

    visitSimpleFilterTerm: function(node) {
        switch (node.expression.type) {
            case 'StringLiteral':
                break;

            case 'FilterLiteral':
                this.visit(node.expression);
                break;

            default:
                throw errors.compileError('RT-INVALID-TERM-TYPE', {
                    type: this._nodeTypeDisplayName(node.expression.type),
                    location: node.location
                });
        }
    },

    _checkFieldNode: function(node, location) {
        if (!this._isValidFieldNode(node)) {
            throw errors.compileError('RT-INVALID-OPERAND-TYPE', {
                operator: '*',
                type: this._nodeTypeDisplayName(node.expression.type),
                // This should really point to node.expression.location but node
                // won't have the "location" property set because it is rebuilt
                // from a JavaScript value created at the build phase. This is
                // yet another place where our double-compilation architecture
                // hurts us.
                location: location
            });
        }
    },

    _checkValueNode: function(node, operator, location) {
        if (!this._isAllowedValueNodeForOperator(node, operator)) {
            throw errors.compileError('RT-INVALID-OPERAND-TYPE', {
                operator: operator,
                type: this._nodeTypeDisplayName(node.type),
                // This should really point to node.location but node won't have
                // the "location" property set because it is rebuilt from a
                // JavaScript value created at the build phase. This is yet
                // another place where our double-compilation architecture hurts
                // us.
                location: location
            });
        }
    },

    _isSimpleFieldReference: function(node) {
        return node.type === 'UnaryExpression' && node.operator === '*';
    },

    _isValidFieldNode: function(node) {
        return node.expression.type === 'StringLiteral';
    },

    _isAllowedValueNodeForOperator: function(node, operator) {
        var self = this;

        switch (operator) {
            case '=~':
            case '!~':
                return node.type === 'StringLiteral'
                    || node.type === 'RegularExpressionLiteral';

            case 'in':
                return node.type === 'ArrayLiteral'
                    && node.elements.every(function(e) { return self._isSimpleLiteral(e); });

            default:
                return this._isSimpleLiteral(node);
        }
    },

    _isSimpleLiteral: function(node) {
        return node.type === 'NullLiteral'
            || node.type === 'BooleanLiteral'
            || node.type === 'NumericLiteral'
            || node.type === 'InfinityLiteral'
            || node.type === 'NaNLiteral'
            || node.type === 'StringLiteral'
            || node.type === 'MomentLiteral'
            || node.type === 'DurationLiteral';
    },

    _nodeTypeDisplayName: function (type) {
        return NODE_TYPE_DISPLAY_NAMES[type];
    }
});

module.exports = FilterChecker;

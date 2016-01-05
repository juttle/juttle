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
        var nodes = this._getFieldAndValueNodes(node.expression);

        if (!this._isValidFieldNode(nodes.field)) {
            throw errors.compileError('RT-INVALID-OPERAND-TYPE', {
                operator: '*',
                type: this._nodeTypeDisplayName(nodes.field.expression.type),
                // This should really point to nodes.field.expression.location
                // but nodes.field won't have the "location" property set
                // because it is rebuilt from a JavaScript value created at the
                // build phase. This is yet another place where our
                // double-compilation architecture hurts us.
                location: node.expression.location
            });
        }

        if (nodes.field2 && !this._isValidFieldNode(nodes.field)) {
            throw errors.compileError('RT-INVALID-OPERAND-TYPE', {
                operator: '*',
                type: this._nodeTypeDisplayName(nodes.field.expression.type),
                // This should really point to nodes.field.expression.location
                // but nodes.field won't have the "location" property set
                // because it is rebuilt from a JavaScript value created at the
                // build phase. This is yet another place where our
                // double-compilation architecture hurts us.
                location: node.expression.location
            });
        }

        if (nodes.value && !this._isAllowedValueNodeForOperator(nodes.value, node.expression.operator)) {
            throw errors.compileError('RT-INVALID-OPERAND-TYPE', {
                operator: node.expression.operator,
                type: this._nodeTypeDisplayName(nodes.value.type),
                // This should really point to nodes.value.location but
                // nodes.value won't have the "location" property set because it
                // is rebuilt from a JavaScript value created at the build
                // phase. This is yet another place where our double-compilation
                // architecture hurts us.
                location: node.expression.location
            });
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

    _getFieldAndValueNodes: function(node) {
        if (this.options.allowFieldComparisons &&
            this._isSimpleFieldReference(node.left) &&
            this._isSimpleFieldReference(node.right))
        {
            return { field: node.left, field2: node.right };
        } else if (this._isSimpleFieldReference(node.left)) {
            return { field: node.left, value: node.right };
        } else if (this._isSimpleFieldReference(node.right)) {
            return { field: node.right, value: node.left };
        } else {
            throw new Error('At least one operand must be a field reference.');
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
            case "=~":
            case "!~":
                return node.type === 'StringLiteral'
                    || node.type === 'RegularExpressionLiteral';

            case "in":
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

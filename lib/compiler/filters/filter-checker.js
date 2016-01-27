'use strict';

// Inspects filter expression AST and throws an error if it is invalid.
//
// For normal expressions, these checks are done in runtime, but for filter
// expressions at least some basic checks need to be done sooner so that the
// various compilers (mostly in adapters) can assume some level of sanity.

var _ = require('underscore');
var ASTVisitor = require('../ast-visitor');
var errors = require('../../errors');
var values = require('../../runtime/values');

// For ExpressionFilterTerms, we use a table of allowed forms for each operator.
// Descriptions of these forms use the following checks to test their operands.

var checks = {
    isSimpleFieldReference: {
        displayName: 'field',

        test: function(node) {
            return node.type === 'UnaryExpression'
                && node.operator === '*'
                && node.expression.type === 'StringLiteral';
        }
    },

    isStringLiteral: {
        displayName: 'string',

        test: function(node) {
            return node.type === 'StringLiteral';
        }
    },

    isRegularExpressionLiteral: {
        displayName: 'regexp',

        test: function(node) {
            return node.type === 'RegularExpressionLiteral';
        }
    },

    isSimpleLiteral: {
        displayName: 'value',

        test: function(node) {
            return node.type === 'NullLiteral'
                || node.type === 'BooleanLiteral'
                || node.type === 'NumericLiteral'
                || node.type === 'InfinityLiteral'
                || node.type === 'NaNLiteral'
                || node.type === 'StringLiteral'
                || node.type === 'MomentLiteral'
                || node.type === 'DurationLiteral';
        }
    },

    isSimpleArrayLiteral: {
        displayName: 'array',

        test: function(node) {
            return node.type === 'ArrayLiteral'
                && _.every(node.elements, checks.isSimpleLiteral.test);
        }
    }
};

// And here comes the description of allowed operator forms.

var ALLOWED_OP_FORMS = {
    '==': [
        { left: checks.isSimpleFieldReference, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isSimpleFieldReference }
    ],

    '!=': [
        { left: checks.isSimpleFieldReference, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isSimpleFieldReference }
    ],

    '=~': [
        { left: checks.isSimpleFieldReference, right: checks.isStringLiteral },
        { left: checks.isSimpleFieldReference, right: checks.isRegularExpressionLiteral },
    ],

    '!~': [
        { left: checks.isSimpleFieldReference, right: checks.isStringLiteral },
        { left: checks.isSimpleFieldReference, right: checks.isRegularExpressionLiteral },
    ],

    '<': [
        { left: checks.isSimpleFieldReference, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isSimpleFieldReference }
    ],

    '>': [
        { left: checks.isSimpleFieldReference, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isSimpleFieldReference }
    ],

    '<=': [
        { left: checks.isSimpleFieldReference, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isSimpleFieldReference }
    ],

    '>=': [
        { left: checks.isSimpleFieldReference, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isSimpleFieldReference }
    ],

    'in': [
        { left: checks.isSimpleFieldReference, right: checks.isSimpleArrayLiteral },
    ]
};

var ALLOWED_OP_FORMS_FIELD_COMPARISON = _(ALLOWED_OP_FORMS).mapObject(function(forms, operator) {
    return _.clone(forms).concat(
        { left: checks.isSimpleFieldReference, right: checks.isSimpleFieldReference }
    );
});

var FilterChecker = ASTVisitor.extend({
    check: function(node, options) {
        this.options = options;

        this.visit(node);
    },

    visitExpressionFilterTerm: function(node) {
        var forms = this.options.allowFieldComparisons
            ? ALLOWED_OP_FORMS_FIELD_COMPARISON[node.expression.operator]
            : ALLOWED_OP_FORMS[node.expression.operator];

        var valid = _.any(forms, function(form) {
            return form.left.test(node.expression.left)
                && form.right.test(node.expression.right);
        });

        if (!valid) {
            var formsDescription = _.map(forms, function(form) {
                return JSON.stringify(form.left.displayName
                    + ' '
                    + node.expression.operator
                    + ' '
                    + form.right.displayName);
            }).join(', ');

            throw errors.compileError('RT-INVALID-EXPRESSION-FILTER-TERM', {
                forms: formsDescription,
                location: node.location
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
                    type: values.typeDisplayName(values.typeOf(values.fromAST(node.expression))),
                    location: node.location
                });
        }
    }
});

module.exports = FilterChecker;

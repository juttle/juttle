'use strict';

// Checks whether a filter expression AST represents a valid *static filter*.
// Static filters don't allow straming expressions such as function calls on
// point fields and restrict forms of comparison expression. This ensures they
// can be compiled into native queries by adapters.

var _ = require('underscore');
var ASTVisitor = require('../ast-visitor');
var errors = require('../../errors');
var values = require('../../runtime/values');

// For ExpressionFilterTerms, we use a table of allowed forms for each operator.
// Descriptions of these forms use the following checks to test their operands.

var checks = {
    isField: {
        displayName: 'field',

        test: function(node) {
            return node.type === 'Field';
        }
    },

    isStringLiteral: {
        displayName: 'string',

        test: function(node) {
            return node.type === 'StringLiteral';
        }
    },

    isRegExpLiteral: {
        displayName: 'regexp',

        test: function(node) {
            return node.type === 'RegExpLiteral';
        }
    },

    isSimpleLiteral: {
        displayName: 'value',

        test: function(node) {
            return node.type === 'NullLiteral'
                || node.type === 'BooleanLiteral'
                || node.type === 'NumberLiteral'
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
        { left: checks.isField, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isField }
    ],

    '!=': [
        { left: checks.isField, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isField }
    ],

    '=~': [
        { left: checks.isField, right: checks.isStringLiteral },
        { left: checks.isField, right: checks.isRegExpLiteral },
    ],

    '!~': [
        { left: checks.isField, right: checks.isStringLiteral },
        { left: checks.isField, right: checks.isRegExpLiteral },
    ],

    '<': [
        { left: checks.isField, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isField }
    ],

    '>': [
        { left: checks.isField, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isField }
    ],

    '<=': [
        { left: checks.isField, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isField }
    ],

    '>=': [
        { left: checks.isField, right: checks.isSimpleLiteral },
        { left: checks.isSimpleLiteral, right: checks.isField }
    ],

    'in': [
        { left: checks.isField, right: checks.isSimpleArrayLiteral },
    ]
};

var StaticFilterChecker = ASTVisitor.extend({
    check: function(node) {
        this.visit(node);
    },

    visitExpressionFilterTerm: function(node) {
        var forms = ALLOWED_OP_FORMS[node.expression.operator];

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

            throw errors.compileError('INVALID-EXPRESSION-FILTER-TERM', {
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
                throw errors.compileError('INVALID-TERM-TYPE', {
                    type: values.typeDisplayName(values.typeOf(values.fromAST(node.expression))),
                    location: node.location
                });
        }
    }
});

module.exports = StaticFilterChecker;

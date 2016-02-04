'use strict';

// Checks whether a filter expression AST represents a valid *dynamic filter*.
// Dynamic filters allow straming expressions such as function calls on point
// fields and don't restrict forms of comparison expression, but they don't
// support FTS. They are intended to be compiled into JavaScript.

var ASTVisitor = require('../ast-visitor');
var errors = require('../../errors');

var DynamicFilterChecker = ASTVisitor.extend({
    check: function(node) {
        this.visit(node);
    },

    visitSimpleFilterTerm: function(node) {
        if (node.expression.type !== 'FilterLiteral') {
            throw errors.compileError('NO-FREE-TEXT', {
                location: node.location
            });
        }
    }
});

module.exports = DynamicFilterChecker;

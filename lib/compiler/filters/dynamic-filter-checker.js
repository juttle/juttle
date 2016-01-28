'use strict';

// Inspects filter expression AST and throws an error if it is invalid.
//
// For normal expressions, these checks are done in runtime, but for filter
// expressions at least some basic checks need to be done sooner so that the
// various compilers (mostly in adapters) can assume some level of sanity.

var ASTVisitor = require('../ast-visitor');
var errors = require('../../errors');

var DynamicFilterChecker = ASTVisitor.extend({
    check: function(node) {
        this.visit(node);
    },

    visitSimpleFilterTerm: function(node) {
        if (node.expression.type !== 'FilterLiteral') {
            throw errors.compileError('RT-NO-FREE-TEXT', {
                location: node.location
            });
        }
    }
});

module.exports = DynamicFilterChecker;

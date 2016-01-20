var ASTVisitor = require('../ast-visitor');
var _ = require('underscore');

var FilterSearcher = ASTVisitor.extend({
    hasField: function(node, fieldName) {
        this.fieldName = fieldName;
        this.found = false;
        this.visit(node);
        return this.found;
    },

    hasFulltextTerm: function(node) {
        this.ftt = false;
        this.visit(node);
        return this.ftt;
    },

    visitBinaryExpression: function(node) {
        this.visit(node.left);
        this.visit(node.right);
    },

    visitUnaryExpression: function(node) {
        if (_.has(node.expression, 'value')) {
            if (node.expression.value === this.fieldName) {
                this.found = true;
            }
        } else {
            this.visit(node.expression);
        }
    },

    visitFulltextFilterTerm: function(node) {
        this.ftt = true;
    },

    visitReferenceFilterTerm: function(node) {
        this.visit(node.expression);
    }
});

module.exports = FilterSearcher;

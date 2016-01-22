'use strict';

var ASTVisitor = require('../compiler/ast-visitor');

// Strips the "location" property from all AST nodes.
var LocationStripper = ASTVisitor.extend({
    strip: function(node) {
        this.visit(node);
    },

    visit: function(node) {
        delete node.location;

        ASTVisitor.prototype.visit.call(this, node);
    }
});

module.exports = LocationStripper;

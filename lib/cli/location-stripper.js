'use strict';

var ASTVisitor = require('../compiler/ast-visitor');

// Strips the "location" property from all AST nodes.
var ASTStripper = ASTVisitor.extend({
    strip: function(node) {
        this.visit(node);
    },

    visit: function(node) {
        delete node.location;

        ASTVisitor.prototype.visit.call(this, node);
    }
});

// Strips the "location" property from either a flowgraph or all AST nodes.
function locationStripper(ast) {
    if (ast.built_graph) {
        ast.built_graph.nodes.forEach(function(node) {
            delete node.location;
        });
    } else {
        new ASTStripper().strip(ast);
    }
}

module.exports = locationStripper;

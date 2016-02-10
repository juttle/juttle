'use strict';

var ASTVisitor = require('../compiler/ast-visitor');

// Strips the "location" property from all AST nodes.
class LocationStripper extends ASTVisitor {
    strip(node) {
        this.visit(node);
    }

    visit(node) {
        delete node.location;

        ASTVisitor.prototype.visit.call(this, node);
    }
}

module.exports = LocationStripper;

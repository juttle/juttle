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

function locationStripper(ast) {
    var stripper = new LocationStripper();
    stripper.strip(ast);
    return ast;
}

module.exports = locationStripper;

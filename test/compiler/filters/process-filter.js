'use strict';

var FilterSimplifier = require('../../../lib/compiler/filters/filter-simplifier');
var SemanticPass = require('../../../lib/compiler/semantic');
var parser = require('../../../lib/parser');

// Converts a filter into an AST and processes it by running the semantic pass
// and the filter simplifier so that it is ready to be compiled.
function processFilter(filter) {
    var ast = parser.parseFilter(filter).ast;

    // We need to run the semantic pass to convert Variable nodes to field
    // references.
    var semantic = new SemanticPass();
    semantic.sa_expr(ast);

    var simplifier = new FilterSimplifier();
    ast = simplifier.simplify(ast);

    return ast;
}

module.exports = processFilter;

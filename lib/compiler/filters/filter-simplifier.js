'use strict';

let ASTTransformer = require('../ast-transformer');
let _ = require('underscore');

// Simplifies filter expression AST before it is passed to a compiler. This is
// mostly to reduce boilerplate code in adapters.
class FilterSimplifier extends ASTTransformer {
    simplify(ast) {
        return this.transform(ast);
    }

    visitExpressionFilterTerm(node) {
        return this.visit(node.expression);
    }

    visitSimpleFilterTerm(node) {
        switch (node.expression.type) {
            case 'StringLiteral':
                return _.chain(node)
                    .clone()
                    .extend({ type: 'FulltextFilterTerm', text: node.expression.value })
                    .omit('expression')
                    .value();

            case 'FilterLiteral':
                return this.visit(node.expression.ast);

            default:
                throw new Error('Invalid node type: ' + node.expression.type + '.');
        }
    }
}

module.exports = FilterSimplifier;

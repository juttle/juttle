'use strict';

let ASTVisitor = require('../ast-visitor');
let errors = require('../../errors');

// Base class for compilers that transform filter expression ASTs into native
// queries. To be inherited and extended by adapters.
class StaticFilterCompiler extends ASTVisitor {
    compile(ast) {
        return this.visit(ast);
    }

    visitNullLiteral(node) {
        this.featureNotSupported(node, 'null');
    }

    visitBooleanLiteral(node) {
        this.featureNotSupported(node, 'booleans');
    }

    visitNumberLiteral(node) {
        this.featureNotSupported(node, 'numbers');
    }

    visitInfinityLiteral(node) {
        this.featureNotSupported(node, 'Infinity');
    }

    visitNaNLiteral(node) {
        this.featureNotSupported(node, 'NaN');
    }

    visitStringLiteral(node) {
        this.featureNotSupported(node, 'strings');
    }

    visitRegExpLiteral(node) {
        this.featureNotSupported(node, 'regular expressions');
    }

    visitMomentLiteral(node) {
        this.featureNotSupported(node, 'moments');
    }

    visitDurationLiteral(node) {
        this.featureNotSupported(node, 'durations');
    }

    visitArrayLiteral(node) {
        this.featureNotSupported(node, 'arrays');
    }

    visitObjectLiteral(node) {
        this.featureNotSupported(node, 'objects');
    }

    visitField(node) {
        this.featureNotSupported(node, 'fields');
    }

    visitMemberExpression(node) {
        this.featureNotSupported(node, 'nested fields');
    }

    visitUnaryExpression(node) {
        this.featureNotSupported(node, `the "${node.operator}" operator`);
    }

    visitBinaryExpression(node) {
        this.featureNotSupported(node, `the "${node.operator}" operator`);
    }

    visitFulltextFilterTerm(node) {
        this.featureNotSupported(node, 'fulltext search');
    }

    featureNotSupported(node, feature) {
        throw errors.compileError('FILTER-FEATURE-NOT-SUPPORTED', {
            feature: feature,
            location: node.location
        });
    }
}

module.exports = StaticFilterCompiler;

'use strict';

let errors = require('../../../lib/errors');
let ASTVisitor = require('../ast-visitor');

// Base class for compilers that transform filter expression ASTs into native
// queries. To be inherited and extended by adapters.
class StaticFilterCompilerBase {
    constructor(adapter) {
        this.adapter = adapter;
        this.visitor = new StaticFilterCompilerBaseVisitor(this);
    }

    compile(node) {
        return this.visitor.visit(node);
    }

    compileLiteral() {
        throw errors.compileError('RT-FILTER-FEATURE-NOT-SUPPORTED', {
            adapter: this.adapter,
            feature: 'values'
        });
    }

    compileField() {
        throw errors.compileError('RT-FILTER-FEATURE-NOT-SUPPORTED', {
            adapter: this.adapter,
            feature: 'fields'
        });
    }

    compileExpressionTerm() {
        throw errors.compileError('RT-FILTER-FEATURE-NOT-SUPPORTED', {
            adapter: this.adapter,
            feature: 'comparison'
        });
    }

    compileFulltextTerm() {
        throw errors.compileError('RT-FILTER-FEATURE-NOT-SUPPORTED', {
            adapter: this.adapter,
            feature: 'fulltext search'
        });
    }

    compileAndExpression() {
        throw errors.compileError('RT-FILTER-FEATURE-NOT-SUPPORTED', {
            adapter: this.adapter,
            feature: 'the AND operator'
        });
    }

    compileOrExpression() {
        throw errors.compileError('RT-FILTER-FEATURE-NOT-SUPPORTED', {
            adapter: this.adapter,
            feature: 'the OR operator'
        });
    }

    compileNotExpression() {
        throw errors.compileError('RT-FILTER-FEATURE-NOT-SUPPORTED', {
            adapter: this.adapter,
            feature: 'the NOT operator'
        });
    }
}

// Visitor which drives StaticFilterCompilerBase.
class StaticFilterCompilerBaseVisitor extends ASTVisitor {
    constructor(compiler) {
        super();

        this.compiler = compiler;
    }

    visitNullLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitBooleanLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitNumericLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitInfinityLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitNaNLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitStringLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitRegularExpressionLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitMomentLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitDurationLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitFilterLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitArrayLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitObjectLiteral(node) {
        return this.compiler.compileLiteral(node);
    }

    visitField(node) {
        return this.compiler.compileField(node);
    }

    visitUnaryExpression(node) {
        if (node.operator === 'NOT') {
            return this.compiler.compileNotExpression(node);
        } else {
            throw new Error('Invalid operator: ' + node.operator + '.');
        }
    }

    visitBinaryExpression(node) {
        switch (node.operator) {
            case 'AND':
                return this.compiler.compileAndExpression(node);

            case 'OR':
                return this.compiler.compileOrExpression(node);

            case '==':
            case '!=':
            case '=~':
            case '!~':
            case '<':
            case '>':
            case '<=':
            case '>=':
            case 'in':
                return this.compiler.compileExpressionTerm(node);

            default:
                throw new Error('Invalid operator: ' + node.operator + '.');
        }
    }

    visitExpressionFilterTerm(node) {
        return this.visit(node.expression);
    }

    visitSimpleFilterTerm(node) {
        switch (node.expression.type) {
            case 'StringLiteral':
                return this.compiler.compileFulltextTerm(node.expression);

            case 'FilterLiteral':
                return this.visit(node.expression);

            default:
                throw new Error('Invalid node type: ' + node.expression.type + '.');
        }
    }
}

module.exports = StaticFilterCompilerBase;

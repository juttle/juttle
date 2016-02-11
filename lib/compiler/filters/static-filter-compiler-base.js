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

    compile() {
        return this.visitor.visit.apply(this.visitor, arguments);
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

    visitNullLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitBooleanLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitNumericLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitInfinityLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitNaNLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitStringLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitRegularExpressionLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitMomentLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitDurationLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitFilterLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitArrayLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitObjectLiteral() {
        return this.compiler.compileLiteral.apply(this.compiler, arguments);
    }

    visitField() {
        return this.compiler.compileField.apply(this.compiler, arguments);
    }

    visitUnaryExpression(node) {
        if (node.operator === 'NOT') {
            return this.compiler.compileNotExpression.apply(this.compiler, arguments);
        } else {
            throw new Error('Invalid operator: ' + node.operator + '.');
        }
    }

    visitBinaryExpression(node) {
        switch (node.operator) {
            case 'AND':
                return this.compiler.compileAndExpression.apply(this.compiler, arguments);

            case 'OR':
                return this.compiler.compileOrExpression.apply(this.compiler, arguments);

            case '==':
            case '!=':
            case '=~':
            case '!~':
            case '<':
            case '>':
            case '<=':
            case '>=':
            case 'in':
                return this.compiler.compileExpressionTerm.apply(this.compiler, arguments);

            default:
                throw new Error('Invalid operator: ' + node.operator + '.');
        }
    }

    visitExpressionFilterTerm(node) {
        var extraArgs = Array.prototype.slice.call(arguments, 1);

        return this.visit.apply(this, [node.expression].concat(extraArgs));
    }

    visitSimpleFilterTerm(node) {
        var extraArgs = Array.prototype.slice.call(arguments, 1);

        switch (node.expression.type) {
            case 'StringLiteral':
                return this.compiler.compileFulltextTerm.apply(
                    this.compiler,
                    [node.expression].concat(extraArgs)
                );

            case 'FilterLiteral':
                return this.visit.apply(this, [node.expression].concat(extraArgs));

            default:
                throw new Error('Invalid node type: ' + node.expression.type + '.');
        }
    }
}

module.exports = StaticFilterCompilerBase;

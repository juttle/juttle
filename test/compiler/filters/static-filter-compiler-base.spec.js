'use strict';

let chai = require('chai');
let expect = chai.expect;

let _ = require('underscore');
let errors = require('../../../lib/errors');
let processFilter = require('./process-filter');
let values = require('../../../lib/runtime/values');

let StaticFilterCompilerBase = require('../../../lib/compiler/filters/static-filter-compiler-base');

// A compiler which doesn't implement any method.
class EmptyCompiler extends StaticFilterCompilerBase {
}

// A compiler which compiles literals (but not fields).
class LiteralCompiler extends StaticFilterCompilerBase {
    compileLiteral() {
    }

    compileExpressionTerm(node) {
        this.compile(node.left);
        this.compile(node.right);
    }
}

// A compiler which compiles fields (but not literals).
class FieldCompiler extends StaticFilterCompilerBase {
    compileField() {
    }

    compileExpressionTerm(node) {
        this.compile(node.left);
        this.compile(node.right);
    }
}

// A compiler which transforms a filter expression into a Lisp S-expression and
// tracks nodes passed to various methods.
class LispCompiler extends StaticFilterCompilerBase {
    constructor() {
        super();

        this.nodes = {
            literal: [],
            field: [],
            expression: [],
            fulltext: [],
            and: [],
            or: [],
            not: []
        };
    }

    compileLiteral(node) {
        this.nodes.literal.push(node);

        return values.inspect(values.fromAST(node));
    }

    compileField(node) {
        this.nodes.field.push(node);

        return `'${node.name}`;
    }

    compileExpressionTerm(node) {
        this.nodes.expression.push(node);

        let leftCode = this.compile(node.left);
        let rightCode = this.compile(node.right);

        return `(${node.operator} ${leftCode} ${rightCode})`;
    }

    compileFulltextTerm(node) {
        this.nodes.fulltext.push(node);

        let stringCode = values.inspect(values.fromAST(node));

        return `(fulltext ${stringCode})`;
    }

    compileAndExpression(node) {
        this.nodes.and.push(node);

        let leftCode = this.compile(node.left);
        let rightCode = this.compile(node.right);

        return `(and ${leftCode} ${rightCode})`;
    }

    compileOrExpression(node) {
        this.nodes.or.push(node);

        let leftCode = this.compile(node.left);
        let rightCode = this.compile(node.right);

        return `(or ${leftCode} ${rightCode})`;
    }

    compileNotExpression(node) {
        this.nodes.not.push(node);

        let expressionCode = this.compile(node.expression);

        return `(not ${expressionCode})`;
    }
}

chai.use((chai, utils) => {
    let Assertion = chai.Assertion;

    // In method definitions, function expressions need to be used instead of
    // arrow functions, otherwise "this" will have a wrong value inside defined
    // methods.

    Assertion.addMethod('receiveNode', function(type, node) {
        let compiler = new LispCompiler('adapter');

        compiler.compile(processFilter(this._obj));

        new Assertion(compiler.nodes[type]).to.have.length(1);
        new Assertion(compiler.nodes[type][0]).to.be.an.instanceOf(Object);
        new Assertion(compiler.nodes[type][0]).to.contain.all.keys(node);
    });

    Assertion.addMethod('compileAs', function(result) {
        let compiler = new LispCompiler('adapter');

        new Assertion(compiler.compile(processFilter(this._obj))).to.equal(result);
    });

    Assertion.addMethod('failToCompile', function(compilerClass, message) {
        let compiler = new compilerClass('adapter');

        new Assertion(() => {
            compiler.compile(processFilter(this._obj));
        }).to.throw(errors.CompileError, message);
    });
});

describe('StaticFilterCompilerBase', () => {
    describe('constructor', () => {
        it('sets properties correctly', () => {
            let compiler = new StaticFilterCompilerBase('adapter');

            expect(compiler.adapter).to.be.equal('adapter');
        });
    });

    // The "compile" method is tested implicitly by other tests.

    describe('compileLiteral', () => {
        let literals = [
            {
                source: 'null',
                node: { type: 'NullLiteral' }
            },
            {
                source: 'true',
                node: { type: 'BooleanLiteral', value: true }
            },
            {
                source: '5',
                node: { type: 'NumericLiteral', value: 5 }
            },
            {
                source: 'Infinity',
                node: { type: 'InfinityLiteral', negative: false }
            },
            {
                source: 'NaN',
                node: { type: 'NaNLiteral' }
            },
            {
                source: '"abcd"',
                node: { type: 'StringLiteral', value: 'abcd' }
            },
            {
                source: '/abcd/',
                node: { type: 'RegularExpressionLiteral', value: 'abcd', flags: '' }
            },
            {
                source: ':2015-01-01T00:00:05.000Z:',
                node: { type: 'MomentLiteral', value: '2015-01-01T00:00:05.000Z' }
            },
            {
                source: ':00:00:05.000:',
                node: { type: 'DurationLiteral', value: '00:00:05.000' }
            },
            // FilterLiteral can't be tested because there is no filter literal syntax.
            {
                source: '[ 1, 2, 3 ]',
                node: {
                    type: 'ArrayLiteral',
                    elements: [
                        { type: 'NumericLiteral', value: 1 },
                        { type: 'NumericLiteral', value: 2 },
                        { type: 'NumericLiteral', value: 3 }
                    ]
                }
            },
            {
                source: '{ a: 1, b: 2, c: 3 }',
                node: {
                    type: 'ObjectLiteral',
                    properties: [
                        {
                            type: 'ObjectProperty',
                            name: { type: 'StringLiteral', value: 'a' },
                            value: { type: 'NumericLiteral', value: 1 },
                        },
                        {
                            type: 'ObjectProperty',
                            name: { type: 'StringLiteral', value: 'b' },
                            value: { type: 'NumericLiteral', value: 2 },
                        },
                        {
                            type: 'ObjectProperty',
                            name: { type: 'StringLiteral', value: 'c' },
                            value: { type: 'NumericLiteral', value: 3 },
                        }
                    ]
                }
            }
        ];

        it('is called for *Literal nodes', () => {
            _.each(literals, (literal) => {
                expect(`a < ${literal.source}`).to.receiveNode('literal', literal.node);
            });
        });

        it('its result is used', () => {
            _.each(literals, (literal) => {
                expect(`a < ${literal.source}`).to.compileAs(`(< \'a ${literal.source})`);
            });
        });

        it('throws CompileError by default', () => {
            _.each(literals, (literal) => {
                expect(`a < ${literal.source}`).to.failToCompile(
                    FieldCompiler,
                    'Filters in the "adapter" adapter do not support values.'
                );
            });
        });
    });

    describe('compileField', () => {
        it('is called for Field nodes', () => {
            expect('a < 5').to.receiveNode('field', {
                type: 'Field',
                name: 'a'
            });
        });

        it('its result is used', () => {
            expect('a < 5').to.compileAs('(< \'a 5)');
        });

        it('throws CompileError by default', () => {
            expect('a < 5').to.failToCompile(
                LiteralCompiler,
                'Filters in the "adapter" adapter do not support fields.'
            );
        });
    });

    describe('compileExpressionTerm', () => {
        let operators = ['==', '!=', '=~', '!~', '<', '>', '<=', '>=', 'in'];

        it('is called for BinaryExpressionl nodes representing expression terms', () => {
            _.each(operators, (operator) => {
                expect(`a ${operator} 5`).to.receiveNode('expression', {
                    type: 'BinaryExpression',
                    operator: operator
                });
            });
        });

        it('its result is used', () => {
            _.each(operators, (operator) => {
                expect(`a ${operator} 5`).to.compileAs(`(${operator} 'a 5)`);
            });
        });

        it('throws CompileError by default', () => {
            _.each(operators, (operator) => {
                expect(`a ${operator} 5`).to.failToCompile(
                    EmptyCompiler,
                    'Filters in the "adapter" adapter do not support comparison.'
                );
            });
        });
    });

    describe('compileFulltextTerm', () => {
        it('is called for StringLiteral nodes representing fulltext terms', () => {
            expect('"abcd"').to.receiveNode('fulltext', {
                type: 'StringLiteral',
                value: 'abcd'
            });
        });

        it('its result is used', () => {
            expect('"abcd"').to.compileAs('(fulltext "abcd")');
        });

        it('throws CompileError by default', () => {
            expect('"abcd"').to.failToCompile(
                EmptyCompiler,
                'Filters in the "adapter" adapter do not support fulltext search.'
            );
        });
    });

    describe('compileAndExpression', () => {
        it('is called for BinaryExpression nodes representing AND', () => {
            expect('a < 5 AND b > 6').to.receiveNode('and', {
                type: 'BinaryExpression',
                operator: 'AND'
            });
        });

        it('its result is used', () => {
            expect('a < 5 AND b > 6').to.compileAs('(and (< \'a 5) (> \'b 6))');
        });

        it('throws CompileError by default', () => {
            expect('a < 5 AND b > 6').to.failToCompile(
                EmptyCompiler,
                'Filters in the "adapter" adapter do not support the AND operator.'
            );
        });
    });

    describe('compileOrExpression', () => {
        it('is called for BinaryExpression nodes representing OR', () => {
            expect('a < 5 OR b > 6').to.receiveNode('or', {
                type: 'BinaryExpression',
                operator: 'OR'
            });
        });

        it('its result is used', () => {
            expect('a < 5 OR b > 6').to.compileAs('(or (< \'a 5) (> \'b 6))');
        });

        it('throws CompileError by default', () => {
            expect('a < 5 OR b > 6').to.failToCompile(
                EmptyCompiler,
                'Filters in the "adapter" adapter do not support the OR operator.'
            );
        });
    });

    describe('compileNotExpression', () => {
        it('is called for UnaryExpression nodes representing NOT', () => {
            expect('NOT a < 5').to.receiveNode('not', {
                type: 'UnaryExpression',
                operator: 'NOT'
            });
        });

        it('its result is used', () => {
            expect('NOT a < 5').to.compileAs('(not (< \'a 5))');
        });

        it('throws CompileError by default', () => {
            expect('NOT a < 5').to.failToCompile(
                EmptyCompiler,
                'Filters in the "adapter" adapter do not support the NOT operator.'
            );
        });
    });
});

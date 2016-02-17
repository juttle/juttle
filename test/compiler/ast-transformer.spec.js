'use strict';

let chai = require('chai');
let expect = chai.expect;

let _ = require('underscore');

let ASTTransformer = require('../../lib/compiler/ast-transformer');

describe('ASTTransformer', () => {
    describe('transform', () => {
        class SimpleTransformer extends ASTTransformer {
            visitNumberLiteral(node) {
                return _.extend(_.clone(node), { value: 2 * node.value });
            }
        }

        class ArgPassingTransformer extends ASTTransformer {
            constructor() {
                super();

                this.args = [];
            }

            visitUnaryExpression(node) {
                return _.extend(_.clone(node), {
                    argument: this.visit(node.argument, 1, 2, 3)
                });
            }

            visitArrayLiteral(node) {
                return _.extend(_.clone(node), {
                    elements: _.map(node.elements, (element, index) =>
                        this.visit(element, index * 3 + 1, index * 3 + 2, index * 3 + 3)
                    )
                });
            }

            visitNumberLiteral(node) {
                this.args.push(arguments);

                return _.extend(_.clone(node), { value: 2 * node.value });
            }
        }

        it('transforms toplevel nodes', () => {
            let transformer = new SimpleTransformer();
            let ast = { type: 'NumberLiteral', value: 5 };

            expect(transformer.transform(ast)).to.deep.equal({
                type: 'NumberLiteral',
                value: 10
            });
        });

        it('transforms nested nodes (simple)', () => {
            let transformer = new SimpleTransformer();
            let ast = {
                type: 'UnaryExpression',
                argument: { type: 'NumberLiteral', value: 5 }
            };

            expect(transformer.transform(ast)).to.deep.equal({
                type: 'UnaryExpression',
                argument: { type: 'NumberLiteral', value: 10 }
            });
        });

        it('passes additional arguments for nested nodes (simple)', () => {
            let transformer = new ArgPassingTransformer();
            let ast = {
                type: 'UnaryExpression',
                argument: { type: 'NumberLiteral', value: 5 }
            };

            transformer.transform(ast);

            expect(transformer.args).to.have.length(1);
            expect(Array.prototype.slice.call(transformer.args[0], 1)).to.deep.equal([1, 2, 3]);
        });

        it('transforms nested nodes (array)', () => {
            let transformer = new ArgPassingTransformer();
            let ast = {
                type: 'ArrayLiteral',
                elements: [
                    { type: 'NumberLiteral', value: 1 },
                    { type: 'NumberLiteral', value: 2 },
                    { type: 'NumberLiteral', value: 3 }
                ]
            };

            expect(transformer.transform(ast)).to.deep.equal({
                type: 'ArrayLiteral',
                elements: [
                    { type: 'NumberLiteral', value: 2 },
                    { type: 'NumberLiteral', value: 4 },
                    { type: 'NumberLiteral', value: 6 }
                ]
            });
        });

        it('passes additional arguments for nested nodes (array)', () => {
            let transformer = new ArgPassingTransformer();
            let ast = {
                type: 'ArrayLiteral',
                elements: [
                    { type: 'NumberLiteral', value: 1 },
                    { type: 'NumberLiteral', value: 2 },
                    { type: 'NumberLiteral', value: 3 }
                ]
            };

            transformer.transform(ast);

            expect(transformer.args).to.have.length(3);
            expect(Array.prototype.slice.call(transformer.args[0], 1)).to.deep.equal([1, 2, 3]);
            expect(Array.prototype.slice.call(transformer.args[1], 1)).to.deep.equal([4, 5, 6]);
            expect(Array.prototype.slice.call(transformer.args[2], 1)).to.deep.equal([7, 8, 9]);
        });
    });
});

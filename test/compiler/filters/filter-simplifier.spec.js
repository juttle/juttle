'use strict';

let chai = require('chai');
let expect = chai.expect;

let parser = require('../../../lib/parser');

let FilterSimplifier = require('../../../lib/compiler/filters/filter-simplifier');

describe('FilterSimplifier', () => {
    describe('simplify', () => {
        it('replaces ExpressionFilterTerms by their expressions', () => {
            let simplifier = new FilterSimplifier();
            let ast = parser.parseFilter('a < 5');

            expect(ast.ast.type).to.equal('ExpressionFilterTerm');

            let simplifiedAst = simplifier.simplify(ast);

            expect(simplifiedAst.ast).to.deep.equal(ast.ast.expression);
        });

        it('replaces SimpleFilterTerms with a String child by FulltextFilterTerms', () => {
            let simplifier = new FilterSimplifier();
            let ast = parser.parseFilter('"abcd"');

            expect(ast.ast.type).to.equal('SimpleFilterTerm');

            let simplifiedAst = simplifier.simplify(ast);

            expect(simplifiedAst.ast).to.deep.equal({
                type: 'FulltextFilterTerm',
                text: ast.ast.expression.value,
                location: ast.ast.location
            });
        });

        // SimpleFilterTerm nodes with a FilterLiteral child can't be tested
        // because there is no filter literal syntax.
    });
});

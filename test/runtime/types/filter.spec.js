'use strict';

var expect = require('chai').expect;

var Filter = require('../../../lib/runtime/types/filter');

describe('Filter', function() {
    describe('constructor', function() {
        it('sets properties correctly', function() {
            var ast = {
                type: 'ExpressionFilterTerm',
                expression: {
                    type: 'BinaryExpression',
                    operator: '==',
                    left: { type: 'Field', name: 'a' },
                    right: { type: 'NumberLiteral', value: 5 }
                }
            };
            var text = 'a == 5';
            var filter = new Filter(ast, text);

            expect(filter.ast).to.eq(ast);
            expect(filter.text).to.eq(text);
        });
    });
});

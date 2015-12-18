var expect = require('chai').expect;

var make_filter = require('../../lib/runtime/runtime-filter');

// tag="apple"
var simple_filter = {
    type: 'ExpressionFilterTerm',
    expression: {
        type: 'BinaryExpression',
        operator: '==',
        left: {
            type: 'UnaryExpression',
            operator: '*',
            value: 'tag',
            expression: { type: 'StringLiteral', value: 'tag' },
        },
        right: { type: 'StringLiteral', value: 'apple' },
    }
};

describe('Runtime filter helper', function() {
    var filt;
    it('creates a simple filter', function() {
        filt = make_filter(simple_filter);
    });

    it('passes a matching point', function() {
        expect(filt({tag: "apple"})).equal(true);
    });

    it('does not pass a non-matching point', function() {
        expect(filt({tag: "banana"})).equal(false);
    });

    it('does not pass a point with a type error (and does not throw)', function() {
        expect(filt({tag: 500})).equal(false);
    });

    it('create a null filter', function() {
        filt = make_filter(null);
    });

    it('passes points through the null filter', function() {
        expect(filt({tag: "apple"})).equal(true);
    });
});

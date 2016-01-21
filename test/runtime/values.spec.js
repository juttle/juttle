var expect = require('chai').expect;
var _ = require('underscore');
var values = require('../../lib/runtime/values');
var JuttleMoment = require('../../lib/moment').JuttleMoment;
var Filter = require('../../lib/runtime/filter');

describe('Values tests', function () {
    describe('toJSONCopmatible', function() {
        it('returns correct representation', function() {
            var tests = [
                {
                    value: true,
                    expected: true,
                },
                {
                    value: null,
                    expected: null,
                },
                {
                    value: 10,
                    expected: 10,
                },
                {
                    value: Infinity,
                    expected: Infinity,
                },
                {
                    value: NaN,
                    expected: NaN,
                },
                {
                    value: 'hello',
                    expected: 'hello',
                },
                {
                    value: new RegExp('abc'),
                    expected: '/abc/',
                },
                {
                    value: new JuttleMoment(0),
                    expected: '1970-01-01T00:00:00.000Z',
                },
                {
                    value: new Filter({
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<',
                            left: { type: 'Variable', name: 'a' },
                            right: { type: 'NumericLiteral', value: 5 }
                        }
                    },
                    'a < 5'
                    ),
                    expected: 'a < 5',
                },
                {
                    value: [1, 2, "a"],
                    expected: [1, 2, "a"],
                },
                {
                    value: [1, 2, new JuttleMoment(0)],
                    expected: [1, 2, '1970-01-01T00:00:00.000Z']
                },
                {
                    value: { a: 'b', c: 'd' },
                    expected: { a: 'b', c: 'd' },
                },
                {
                    value: [1, 2, { o: { a: new JuttleMoment(0), c: 'd' } }],
                    expected: [1, 2, { o: { a: '1970-01-01T00:00:00.000Z', c: 'd' } }]
                }
            ];

            _.each(tests, function(test) {
                expect(values.toJSONCompatible(test.value)).to.deep.equal(test.expected);
            });
        });
    });

    describe('compare', function() {
        describe('invalid comparison', function() {
            it('throws error', function() {
                var tests = [
                    { left: 1, right: [] },
                    { left: [], right: true }
                ];

                _.each(tests, function(test) {
                    expect(values.compare.bind(test.left, test.right)).to.throw.error;
                });
            });
        });

        it('array', function() {
            var tests = [
                { left: [], right: [], result: 0 },
                { left: [], right: [[]], result: -1 },
                { left: [[]], right: [], result: 1 },
                { left: [1], right: [2], result: -1 },
                { left: [1], right: [1], result: 0 },
                { left: [2], right: [1], result: 1 },
                { left: [1, 2], right: [1, 1], result: 1 },
                { left: [1, 1], right: [1, 1], result: 0 },
                { left: [1, 1], right: [1, 2], result: -1 },
                { left: [2, 1], right: [1, 1], result: 1 },
                { left: [1, 1], right: [2, 1], result: -1 },
                { left: [[1]], right: [[2]], result: -1 },
                { left: [[1]], right: [[1]], result: 0 },
                { left: [[2]], right: [[1]], result: 1 },
            ];

            _.each(tests, function(test) {
                expect(values.compare(test.left, test.right)).to.equal(
                    test.result,
                    JSON.stringify(test.left) + ' <=> ' + JSON.stringify(test.right)
                );
            });
        });

        it('moment', function() {
            var tests = [
                {
                    left: new JuttleMoment(1),
                    right: new JuttleMoment(0),
                    result: 1
                },
                {
                    left: new JuttleMoment(0),
                    right: new JuttleMoment(0),
                    result: 0
                },
                {
                    left: new JuttleMoment(0),
                    right: new JuttleMoment(1),
                    result: -1
                },
                {
                    left: new JuttleMoment({ raw: 0, epsilon: true }),
                    right: new JuttleMoment({ raw: 0, epsilon: true  }),
                    result: 0
                },
                {
                    left: new JuttleMoment({ raw: 0, epsilon: false }),
                    right: new JuttleMoment({ raw: 0, epsilon: false }),
                    result: 0
                },
                {
                    left: new JuttleMoment({ raw: 0, epsilon: true }),
                    right: new JuttleMoment({ raw: 0, epsilon: false }),
                    result:  -1
                },
                {
                    left: new JuttleMoment({ raw: 0, epsilon: false }),
                    right: new JuttleMoment({ raw: 0, epsilon: true }),
                    result: 1
                },
                {
                    left: new JuttleMoment(Infinity),
                    right: new JuttleMoment(Infinity),
                    result: 0
                },
                {
                    left: new JuttleMoment(-Infinity),
                    right: new JuttleMoment(-Infinity),
                    result: 0
                },
                {
                    left: new JuttleMoment(Infinity),
                    right: new JuttleMoment(-Infinity),
                    result: 1
                },
                {
                    left: new JuttleMoment(-Infinity),
                    right: new JuttleMoment(Infinity),
                    result: -1
                },
                {
                    left: new JuttleMoment({ raw: Infinity, epsilon: true }),
                    right: new JuttleMoment({ raw: Infinity, epsilon: false }),
                    result: -1
                },
                {
                    left: new JuttleMoment({ raw: Infinity, epsilon: false }),
                    right: new JuttleMoment({ raw: Infinity, epsilon: true }),
                    result: 1
                },
                {
                    left: new JuttleMoment({ raw: -Infinity, epsilon: true }),
                    right: new JuttleMoment({ raw: -Infinity, epsilon: false }),
                    result: -1
                },
                {
                    left: new JuttleMoment({ raw: -Infinity, epsilon: false }),
                    right: new JuttleMoment({ raw: -Infinity, epsilon: true }),
                    result: 1
                },
            ];

            _.each(tests, function(test) {
                expect(values.compare(test.left, test.right)).to.equal(
                    test.result,
                    test.left.valueOf() + ' (eps: ' + test.left.epsilon + ')'
                    + ' <=> '
                    + test.right.valueOf() + ' (eps: ' + test.right.epsilon + ')'
                );
            });
        });
    });

    describe('toString', function() {
        it('returns correct string representation', function() {
            var tests = [
                {
                    value: null,
                    expected: 'null'
                },
                {
                    value: true,
                    expected: 'true'
                },
                {
                    value: false,
                    expected: 'false'
                },
                {
                    value: 5,
                    expected: '5'
                },
                {
                    value: Infinity,
                    expected: 'Infinity'
                },
                {
                    value: NaN,
                    expected: 'NaN'
                },
                {
                    value: '',
                    expected: ''
                },
                {
                    value: 'abcd',
                    expected: 'abcd'
                },
                {
                    value: new RegExp(''),
                    expected: '/(?:)/'
                },
                {
                    value: /abcd/,
                    expected: '/abcd/'
                },
                {
                    value: new JuttleMoment.duration('5', 'seconds'),
                    expected: '00:00:05.000'
                },
                {
                    value: new JuttleMoment('2015-01-01T00:00:05'),
                    expected: '2015-01-01T00:00:05.000Z'
                },
                {
                    value: new Filter({
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<',
                            left: { type: 'Variable', name: 'a' },
                            right: { type: 'NumericLiteral', value: 5 }
                        }
                    },
                        'a < 5'
                    ),
                    expected: 'a < 5'
                },
                {
                    value: [],
                    expected: '[]'
                },
                {
                    value: [1, 2, 3],
                    expected: '[ 1, 2, 3 ]'
                },
                {
                    value: ['abcd', new JuttleMoment.duration('5', 'seconds') ],
                    expected: '[ "abcd", :00:00:05.000: ]'
                },
                {
                    value: {},
                    expected: '{}'
                },
                {
                    value: { a: 1, b: 2, c: 3 },
                    expected: '{ a: 1, b: 2, c: 3 }'
                },
                {
                    value: { a: 'abcd', b: new JuttleMoment.duration('5', 'seconds') },
                    expected: '{ a: "abcd", b: :00:00:05.000: }'
                },
            ];

            _.each(tests, function(test) {
                expect(values.toString(test.value)).to.equal(test.expected);
            });
        });

    });

    describe('inspect', function() {
        it('returns correct string representation', function() {
            var tests = [
                {
                    value: null,
                    expected: 'null'
                },
                {
                    value: true,
                    expected: 'true'
                },
                {
                    value: false,
                    expected: 'false'
                },
                {
                    value: 5,
                    expected: '5'
                },
                {
                    value: Infinity,
                    expected: 'Infinity'
                },
                {
                    value: NaN,
                    expected: 'NaN'
                },
                {
                    value: '',
                    expected: '""'
                },
                {
                    value: 'abcd',
                    expected: '"abcd"'
                },
                {
                    value: new RegExp(''),
                    expected: '/(?:)/'
                },
                {
                    value: /abcd/,
                    expected: '/abcd/'
                },
                {
                    value: new JuttleMoment.duration('5', 'seconds'),
                    expected: ':00:00:05.000:'
                },
                {
                    value: new JuttleMoment('2015-01-01T00:00:05'),
                    expected: ':2015-01-01T00:00:05.000Z:'
                },
                {
                    value: new Filter({
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<',
                            left: { type: 'Variable', name: 'a' },
                            right: { type: 'NumericLiteral', value: 5 }
                        }
                    },
                        'a < 5'
                    ),
                    expected: 'filter(a < 5)'
                },
                {
                    value: [],
                    expected: '[]'
                },
                {
                    value: [1, 2, 3],
                    expected: '[ 1, 2, 3 ]'
                },
                {
                    value: ['abcd', new JuttleMoment.duration('5', 'seconds') ],
                    expected: '[ "abcd", :00:00:05.000: ]'
                },
                {
                    value: {},
                    expected: '{}'
                },
                {
                    value: { a: 1, b: 2, c: 3 },
                    expected: '{ a: 1, b: 2, c: 3 }'
                },
                {
                    value: { a: 'abcd', b: new JuttleMoment.duration('5', 'seconds') },
                    expected: '{ a: "abcd", b: :00:00:05.000: }'
                },
            ];
            _.each(tests, function(test) {
                expect(values.inspect(test.value)).to.equal(test.expected);
            });
        });
    });

    describe('typeOf', function() {
        it('correctly identifies value type', function() {
            var tests = [
                {
                    value: true,
                    expected: 'Boolean',
                },
                {
                    value: null,
                    expected: 'Null',
                },
                {
                    value: 10,
                    expected: 'Number',
                },
                {
                    value: Infinity,
                    expected: 'Number',
                },
                {
                    value: NaN,
                    expected: 'Number',
                },
                {
                    value: 'hello',
                    expected: 'String',
                },
                {
                    value: new RegExp('abc'),
                    expected: 'RegExp',
                },
                {
                    value: new JuttleMoment(0),
                    expected: 'Date',
                },
                {
                    value: JuttleMoment.duration('5', 's'),
                    expected: 'Duration',
                },
                {
                    value: new Filter({
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<',
                            left: { type: 'Variable', name: 'a' },
                            right: { type: 'NumericLiteral', value: 5 }
                        }
                    },
                    'a < 5'
                    ),
                    expected: 'Filter',
                },
                {
                    value: [1, 2, 'a'],
                    expected: 'Array',
                },
                {
                    value: { a: 'b', c: 'd' },
                    expected: 'Object',
                }
            ];
            _.each(tests, function(test) {
                expect(values.typeOf(test.value)).to.equal(test.expected);
            });
        });
    });

    describe('is helpers', function() {
        it('correctly identify a type', function() {
            var types = [
                'Null',
                'Boolean',
                'Number',
                'String',
                'RegExp',
                'Date',
                'Duration',
                'Filter',
                'Array',
                'Object'
            ];

            var vals = [
                null,
                true,
                10,
                'hello',
                new RegExp('abcd'),
                new JuttleMoment(0),
                JuttleMoment.duration('5', 's'),
                new Filter({
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '<',
                        left: { type: 'Variable', name: 'a' },
                        right: { type: 'NumericLiteral', value: 5 }
                    }
                },
                    'a < 5'
                ),
                [1, 2, 3],
                { a: 'b', c: 'd' }
            ];

            _.each(types, function(t, i) {
                _.each(vals, function(v, j) {
                    var isType = values['is' + t](v);

                    if (i === j) {
                        expect(isType).to.equal(true, 'is' + t + ': ' + v);
                    } else {
                        expect(isType).to.equal(false, 'is' + t + ': ' + v);
                    }
                });
            });
        });
    });
});

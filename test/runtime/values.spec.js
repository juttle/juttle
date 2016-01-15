var expect = require('chai').expect;
var _ = require('underscore');
var values = require('../../lib/runtime/values');
var JuttleMoment = require('../../lib/moment').JuttleMoment;

describe('Values tests', function () {
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
});

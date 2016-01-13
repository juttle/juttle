var expect = require('chai').expect;
var _ = require('underscore');
var values = require('../../lib/runtime/values');

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
    });
});

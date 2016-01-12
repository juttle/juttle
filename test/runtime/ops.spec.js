var expect = require('chai').expect;
var _ = require('underscore');
var ops = require('../../lib/runtime/ops');

describe('Ops tests', function () {
    describe('gt', function() {
        describe('invalid comparison', function() {
            it('throws error', function() {
                var tests = [
                    { left: 1, right: [] },
                    { left: [], right: true }
                ];

                _.each(tests, function(test) {
                    expect(ops.gt.bind(ops, test.left, test.right)).to.throw.error;
                });
            });
        });

        it('array', function() {
            var tests = [
                { left: [], right: [], result: false },
                { left: [], right: [[]], result: false },
                { left: [[]], right: [], result: true },
                { left: [1], right: [2], result: false },
                { left: [1], right: [1], result: false },
                { left: [2], right: [1], result: true },
                { left: [1, 2], right: [1, 1], result: true },
                { left: [1, 1], right: [1, 1], result: false },
                { left: [1, 1], right: [1, 2], result: false },
                { left: [2, 1], right: [1, 1], result: true },
                { left: [1, 1], right: [2, 1], result: false },
                { left: [[2]], right: [[2]], result: false },
                { left: [[1]], right: [[1]], result: false },
                { left: [[2]], right: [[1]], result: true },
            ];

            _.each(tests, function(test) {
                expect(ops.gt(test.left, test.right)).to.equal(
                    test.result,
                    JSON.stringify(test.left) + ' gt ' + JSON.stringify(test.right)
                );
            });
        });
    });

    describe('lt', function() {
        describe('invalid comparison', function() {
            it('throws error', function() {
                var tests = [
                    { left: 1, right: [] },
                    { left: [], right: true }
                ];

                _.each(tests, function(test) {
                    expect(ops.lt.bind(ops, test.left, test.right)).to.throw.error;
                });
            });
        });

        it('array', function() {
            var tests = [
                { left: [], right: [], result: false },
                { left: [], right: [[]], result: true },
                { left: [[]], right: [], result: false },
                { left: [1], right: [2], result: true },
                { left: [1], right: [1], result: false },
                { left: [2], right: [1], result: false },
                { left: [1, 2], right: [1, 1], result: false },
                { left: [1, 1], right: [1, 1], result: false },
                { left: [1, 1], right: [1, 2], result: true },
                { left: [2, 1], right: [1, 1], result: false },
                { left: [1, 1], right: [2, 1], result: true },
                { left: [[1]], right: [[2]], result: true },
                { left: [[1]], right: [[1]], result: false },
                { left: [[2]], right: [[1]], result: false },
            ];

            _.each(tests, function(test) {
                expect(ops.lt(test.left, test.right)).to.equal(
                    test.result,
                    JSON.stringify(test.left) + ' lt ' + JSON.stringify(test.right)
                );
            });
        });
    });
});

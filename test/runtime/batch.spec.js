var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;

describe('batch tests', function () {
    it('can batch an empty set', function() {
        var program = 'emit -from Date.new(0) -limit 10 | filter time<Date.new(0) | batch 1 | view result';
        return check_juttle({
            program: program
        })
        .then(function(res) {
            expect(res.sinks.result.length).to.equal(0);
        });
    });

    it('batch flushes points on eof', function() {
        var program = 'emit -from Date.new(0) -hz 100 -limit 11 | batch 0.1 | reduce count() | keep count | view result';

        return check_juttle({
            program: program
        })
        .then(function(res) {
            var expected_value = [
                {count:10},
                {count:1}
            ];
            expect(res.sinks.result).deep.equal(expected_value);
        });
    });

    it('batch drops ooo points that straddle batch boundaries', function() {
        var program = 'read file -file "input/ooo-single-cross-batch.json" | batch 1 | view result';

        return check_juttle({
            program: program
        })
        .then(function(res) {
            expect(res.sinks.result.length).equal(3);
        });
    });

    it('batch warns on ooo points that straddle batch boundaries', function() {
        var program = 'read file -file "input/ooo-single-cross-batch.json" | batch 1 | view result';

        return check_juttle({
            program: program
        })
        .then(function(res) {
            expect(res.warnings[0]).match(/batch dropped out-of-order point\(s\)/);
        });
    });

    it('batch throttles warning when multiple on ooo points in same batch', function() {
        var program = 'read file -file "input/ooo-multi-cross-batch.json" | batch 1 | view result';

        return check_juttle({
            program: program
        })
        .then(function(res) {
            expect(res.sinks.result.length).equal(3);
            expect(res.warnings.length).equal(1);
        });
    });

    it('batch neither drops nor warns on ooo points that fall within batch boundaries', function() {
        var program = 'read file -file "input/ooo-multi-same-batch.json" | batch 1 | view result';

        return check_juttle({
            program: program
        })
        .then(function(res) {
            expect(res.sinks.result.length).equal(6);
            expect(res.warnings.length).equal(0);
        });
    });

    it('batch passes timeless points through', function() {
        return check_juttle({
            // contrived program to generate a sequence of points having alternating timefulness
            program: 'emit -from :0: -limit 3 | batch 1 | (remove time; pass) | unbatch | batch 1 | view result'
        })
        .then(function(res) {
            expect(res.sinks.result).deep.equal([
                { },
                { 'time': '1970-01-01T00:00:00.000Z' },
                { },
                { 'time': '1970-01-01T00:00:01.000Z' },
                { },
                { 'time': '1970-01-01T00:00:02.000Z' }
            ]);
        });
    });

    it('batch warns on timeless points (once)', function() {
        return check_juttle({
            program: 'read file -file "input/timeless.json" | batch 2 | view result'
        })
        .then(function(res) {
            expect(res.warnings.length).equal(1);
        });
    });
});

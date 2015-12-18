var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The Number.fromString function', function() {

    it('Returns correct result when passed a string representation of an integer', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Number.fromString("1") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: 1 } ]);
            res.prog.deactivate();
            });
    });

    it('Returns correct result when passed a string representation of a float', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Number.fromString("1.345") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: 1.345 } ]);
            res.prog.deactivate();
            });
    });

    it('Returns correct result when passed a string representation of an negative integer', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Number.fromString("-1") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: -1 } ]);
            res.prog.deactivate();
            });
    });

    it('Returns correct result when passed a string representation of a negative float', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Number.fromString("-1.345") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: -1.345 } ]);
            res.prog.deactivate();
            });
    });

    it('Returns NaN when passed a string not representing a number', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Number.fromString("hello") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: NaN } ]);
            res.prog.deactivate();
            });
    });

    it('Returns NaN when passed a non-string', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Number.fromString(null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"Number.fromString\": expected string, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

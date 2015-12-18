var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The RegExp.toString function', function() {

    it('Returns correct result when passed a regexp', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = RegExp.toString(/abcd/i) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: '/abcd/i' } ]);
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed an argument of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = RegExp.toString(null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"RegExp.toString\": expected regular expression, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

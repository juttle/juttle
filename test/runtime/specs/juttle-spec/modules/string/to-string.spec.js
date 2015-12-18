var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.toString function', function() {

    it('Returns correct result when passed a string', function() {
        var program = 'emit -limit 1 | put result = String.toString("abcd") | keep result | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { result: 'abcd' } ]);
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed an argument of invalid type', function() {
        var program = 'emit -limit 1 | put result = String.toString(null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.toString\": expected string, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

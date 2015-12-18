var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The Math.pow function', function() {

    it('Produces an error when passed argument x of incorrect type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Math.pow(null, 5) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"Math.pow\": expected number, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument y of incorrect type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Math.pow(5, null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"Math.pow\": expected number, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

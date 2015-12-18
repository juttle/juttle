var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.substr function', function() {

    it('Produces an error when passed argument string of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.substr(null, 5, 6) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.substr\": expected string, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument start of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.substr("abcd", null, 6) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.substr\": expected number, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument length of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.substr("abcd", 5, null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.substr\": expected number, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

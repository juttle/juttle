var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.slice function', function() {

    it('Produces an error when passed argument string of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.slice(null, 5, 6) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.slice\": expected string, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument start of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.slice("abcd", null, 6) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.slice\": expected number, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument end of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.slice("abcd", 5, null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.slice\": expected number, received null.");
            res.prog.deactivate();
            });
    });

    it('Returns the correct end slice of a string', function() {
        var program = 'emit -limit 1 | put message = String.slice(\'FizzBuzz\', 4) | keep message | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { message: 'Buzz' } ]);
            res.prog.deactivate();
            });
    });

    it('Returns the correct head slice of the string', function() {
        var program = 'emit -limit 1 | put message = String.slice(\'FizzBuzz\', 0, 4) | keep message | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { message: 'Fizz' } ]);
            res.prog.deactivate();
            });
    });

    it('Returns the correct middle slice of the string', function() {
        var program = 'emit -limit 1 | put message = String.slice(\'FizzBuzz\', 1, 6) | keep message | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { message: 'izzBu' } ]);
            res.prog.deactivate();
            });
    });
}); // describe block 

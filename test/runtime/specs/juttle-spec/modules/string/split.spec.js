var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.split function', function() {

    it('Produces an error when passed argument string of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.split(null, "efgh") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.split\": expected string, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument separator of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.split("abcd", null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.split\": expected string or regular expression, received null.");
            res.prog.deactivate();
            });
    });

    it('Splits string into an array based on a separator', function() {
        var program = 'emit -limit 1 | put elements = String.split(\'joe,meg,bob,may\', \',\') | keep elements | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { elements: [ 'joe', 'meg', 'bob', 'may' ] } ]);
            res.prog.deactivate();
            });
    });

    it('Returns a list with a single element', function() {
        var program = 'emit -limit 1 | put elements = String.split(\'banana\', \'.\') | keep elements | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { elements: [ 'banana' ] } ]);
            res.prog.deactivate();
            });
    });
}); // describe block 

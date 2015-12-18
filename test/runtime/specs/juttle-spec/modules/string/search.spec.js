var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.search function', function() {

    it('Returns match position when the search is successful', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.search("abcd", /bc/) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: 1 } ]);
            res.prog.deactivate();
            });
    });

    it('Returns -1 when the search is unsuccessful', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.search("abcd", /fg/) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: -1 } ]);
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument string of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.search(null, /abcd/) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.search\": expected string, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument regexp of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.search("abcd", null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.search\": expected regexp, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

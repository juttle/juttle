var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.indexOf function', function() {

    it('Returns correct result', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.indexOf(\'A Blue Whale\', \'Blue\') | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: 2 } ]);
            res.prog.deactivate();
            });
    });

    it('Returns correct result when string not found', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.indexOf(\'Blue Whale\', \'Blute\') | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: -1 } ]);
            res.prog.deactivate();
            });
    });

    it('Is case-sensitive', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.indexOf(\'Blue Whale\', \'blue\') | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: -1 } ]);
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument string of incorrect type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.indexOf(null, "efgh") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.indexOf\": expected string, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument searchString of incorrect type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.indexOf("abcd", null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.indexOf\": expected string, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

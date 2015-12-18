var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The Object.keys function', function() {

    it('Returns correct result with no keys', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Object.keys({}) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: [] } ]);
            res.prog.deactivate();
            });
    });

    it('Returns correct result with one key', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Object.keys({\'a\': 1}) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: [ 'a' ] } ]);
            res.prog.deactivate();
            });
    });

    it('Returns correct result with multiple keys', function() {
        var program = 'emit -from Date.new(0) -limit 1\n| put result = Object.keys({\'a\': 1, \'b\': 2})\n| split result\n| sort value\n| keep value\n| view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { value: 'a' }, { value: 'b' } ]);
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument object of incorrect type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = Object.keys(null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"Object.keys\": expected object, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

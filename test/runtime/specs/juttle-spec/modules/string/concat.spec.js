var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.concat function', function() {

    it('Produces an error when passed an argument of incorrect type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.concat(null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.concat\": expected string, received null.");
            res.prog.deactivate();
            });
    });

    it('Concatenation works as expected', function() {
        var program = 'emit -from Date.new(0) -limit 1\n| put hello = \'hello\', world=\'world\'\n| put message = String.concat(hello, \' \', world)\n| keep message\n| view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { message: 'hello world' } ]);
            res.prog.deactivate();
            });
    });
}); // describe block 

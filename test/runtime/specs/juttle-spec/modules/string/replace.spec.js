var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The String.replace function', function() {

    it('Returns correct result for String.replace with string', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.replace("hayneedlehay", "needle", "replace") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: 'hayreplacehay' } ]);
            res.prog.deactivate();
            });
    });

    it('Returns correct result for String.replace with regex', function() {
        var program = '    emit -from Date.new(0) -limit 1 | put result = String.replace("hayneeeeeeedlehay", /ne+dle/, "replace") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', result: 'hayreplacehay' } ]);
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument string of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.replace(null, "efgh", "ijkl") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.replace\": expected string, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument searchValue of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.replace("abcd", null, "ijkl") | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.replace\": expected string or regular expression, received null.");
            res.prog.deactivate();
            });
    });

    it('Produces an error when passed argument replaceValue of invalid type', function() {
        var program = 'emit -from Date.new(0) -limit 1 | put result = String.replace("abcd", "efgh", null) | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.warnings[0]).to.include("Invalid argument type for \"String.replace\": expected string, received null.");
            res.prog.deactivate();
            });
    });
}); // describe block 

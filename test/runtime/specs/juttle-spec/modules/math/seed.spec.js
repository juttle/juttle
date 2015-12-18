var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('The Math.seed function', function() {

    it('seed wants a number', function() {
        var program = 'const seed = Math.seed("juttle");\nemit -from Date.new(0) -limit 5\n| put r = Math.random()\n| view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.errors[0]).to.include("Invalid argument type for \"Math.seed\": expected number, received string (juttle).");
            res.prog.deactivate();
            }, function(err) {
                expect(err.toString()).to.include("Invalid argument type for \"Math.seed\": expected number, received string (juttle).");
            });
    });

    it('Seeded RNG is predictable', function() {
        var program = 'const seed = Math.seed(42);\nemit -from Date.new(0) -limit 5\n| put r = Math.random()\n| view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z', r: 0.0016341939679719736 },
      { time: '1970-01-01T00:00:01.000Z', r: 0.9364577392619949 },
      { time: '1970-01-01T00:00:02.000Z', r: 0.6594512913361081 },
      { time: '1970-01-01T00:00:03.000Z', r: 0.26366393983479847 },
      { time: '1970-01-01T00:00:04.000Z', r: 0.7841788012846541 } ]);
            res.prog.deactivate();
            });
    });
}); // describe block 

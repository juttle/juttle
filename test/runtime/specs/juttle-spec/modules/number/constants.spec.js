var expect = require('chai').expect;

var juttle_test_utils = require('/Users/demmer/work/juttle/test/runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('Number constants', function() {

    it('All Number constants are present', function() {
        var program = 'emit -from Date.new(0) -limit 1\n  | put max_value         = Number.MAX_VALUE\n  | put min_value         = Number.MIN_VALUE\n  | put nan               = Number.NaN\n  | put positive_infinity = Number.POSITIVE_INFINITY\n  | put negative_infinity = Number.NEGATIVE_INFINITY\n  | view result';
        var moduleResolver = juttle_test_utils.module_resolver({});

        return check_juttle({ program: program, moduleResolver: moduleResolver })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([ { time: '1970-01-01T00:00:00.000Z',
        max_value: 1.7976931348623157e+308,
        min_value: 5e-324,
        nan: NaN,
        positive_infinity: Infinity,
        negative_infinity: -Infinity } ]);
            res.prog.deactivate();
            });
    });
}); // describe block 

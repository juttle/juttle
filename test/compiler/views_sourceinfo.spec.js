var expect = require('chai').expect;
var compiler = require('../../lib/compiler');
var views_sourceinfo = require('../../lib/compiler/flowgraph/views_sourceinfo.js');
var juttle_test_utils = require('../runtime/specs/juttle-test-utils'); // jshint ignore: line

describe('Views get info on source time bounds', function() {
    function test(juttle, spec) {
        it(juttle, function() {
            var prog = compiler.compileSync(juttle, {fg_processors: [views_sourceinfo]});
            var views = prog.get_client_sinks();
            var expected, actual;

            for (var i = 0; i < views.length; i++) {
                for (var j = 0; j < spec[i].length; j++) {
                    expected = spec[i][j];
                    actual = views[i].options._jut_time_bounds[j];

                    if (expected.from !== null) {
                        expect(expected.from).to.equal(actual.from.toISOString());
                    } else {
                        expect(expected.from).to.be.null;
                    }

                    if (expected.to !== null) {
                        expect(expected.to).to.equal(actual.to.toISOString());
                    } else {
                        expect(expected.to).to.be.null;
                    }

                    if (expected.last !== null) {
                        expect(expected.last).to.equal(actual.last);
                    } else {
                        expect(expected.last).to.be.null;
                    }
                }
            }
        });
    }

    var from = '2015-01-01T00:00:00.000Z';
    var to = '2015-02-02T00:00:00.000Z';
    var last = '01:00:00.000';

    test('read stochastic -source "cdn" | view view ', [[{from: null, to: null, last: null}]]);
    test('read stochastic -source "cdn" -from :' + from + ': | view view ', [[{from: from, to: null, last: null}]]);
    test('read stochastic -source "cdn" -from :' + from + ': -to :' + to + ': | view view ', [[{from: from, to: to, last: null}]]);
    test('read stochastic -last :' + last + ': -source "cdn" | view view ', [[{from: null, to: null, last: last}]]);

    test('read stochastic -source "cdn" -from :' + from + ': | view view; read stochastic -last :' + last + ': -source "cdn"  | view view ',
         [[{from: from, to: null, last: null}], [{from: null, to: null, last: last}]]);

    test('(read stochastic -source "cdn" -from :' + from + ':; read stochastic -last :' + last + ': -source "cdn" ) | view view ',
         [[{from: from, to: null, last: null}, {from: null, to: null, last: last}]]);

});

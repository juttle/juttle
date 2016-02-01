'use strict';

var expect = require('chai').expect;
var compiler = require('../../lib/compiler');
var views_sourceinfo = require('../../lib/compiler/flowgraph/views_sourceinfo.js');
var juttle_test_utils = require('../runtime/specs/juttle-test-utils'); // eslint-disable-line
var JuttleMoment = require('../../lib/moment').JuttleMoment;

describe('Views get info on source time bounds', function() {
    function test(juttle, spec) {
        it(juttle, function() {
            var prog = compiler.compileSync(juttle, {fg_processors: [views_sourceinfo]});
            var views = prog.get_views();
            var expected, actual;

            for (var i = 0; i < views.length; i++) {
                for (var j = 0; j < spec[i].length; j++) {
                    expected = spec[i][j];
                    actual = views[i].options._jut_time_bounds[j];

                    if (expected.from !== null) {
                        expect(JuttleMoment.eq(expected.from, actual.from)).to.equal(true);
                    } else {
                        expect(expected.from).to.be.null;
                    }

                    if (expected.to !== null) {
                        expect(JuttleMoment.eq(expected.to, actual.to)).to.equal(true);
                    } else {
                        expect(expected.to).to.be.null;
                    }

                    if (expected.last !== null) {
                        expect(JuttleMoment.eq(expected.last, actual.last)).to.equal(true);
                    } else {
                        expect(expected.last).to.be.null;
                    }
                }
            }
        });
    }

    var from = new JuttleMoment({ raw: '2015-01-01T00:00:00.000Z' });
    var to = new JuttleMoment({ raw: '2015-02-02T00:00:00.000Z' });
    var last = JuttleMoment.duration(1, 'hour');

    test('read stochastic -source "cdn" -from :' + from.valueOf() + ': | view view ', [[{from: from, to: null, last: null}]]);
    test('read stochastic -source "cdn" -from :' + from.valueOf() + ': -to :' + to.valueOf() + ': | view view ', [[{from: from, to: to, last: null}]]);
    test('read stochastic -last :' + last.valueOf() + ': -source "cdn" | view view ', [[{from: null, to: null, last: last}]]);

    test('read stochastic -source "cdn" -from :' + from.valueOf() + ': | view view; read stochastic -last :' + last.valueOf() + ': -source "cdn"  | view view ',
         [[{from: from, to: null, last: null}], [{from: null, to: null, last: last}]]);

    test('(read stochastic -source "cdn" -from :' + from.valueOf() + ':; read stochastic -last :' + last.valueOf() + ': -source "cdn" ) | view view ',
         [[{from: from, to: null, last: null}, {from: null, to: null, last: last}]]);

});

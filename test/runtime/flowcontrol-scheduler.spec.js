'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;

describe('Flow control tests', function() {
    describe('parallel reads', function() {
        it('do not flood flowgraph', function() {
            return check_juttle({
                program: '(read testTimeseries -lag :0s: -every :0.2s: -from :now: -to :end:; read testTimeseries -lag :0s: -every :2s: -from :now: -to :end:) | view result',
                realtime: true
            })
            .then(function(res) {
                console.log(res.sinks.result);
            })
        });
    });
});

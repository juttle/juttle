'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;

describe('read testTimeseries', function () {
    it('requires -from or -to', function() {
        return check_juttle({
            program: 'read testTimeseries'
        })
        .then(function(result) {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.code).equal('MISSING-TIME-RANGE-ERROR');
            expect(err.message).equal('One of -from, -to, or -last must be specified to define a query time range');
        });
    });

    it('handles pure historical mode', function() {
        return check_juttle({
            program: 'read testTimeseries -from :2015-01-01: -to :2015-01-05: -every :1d:'
        })
        .then(function(result) {
            var expected = [
                { time: '2015-01-01T00:00:00.000Z', count: 0 },
                { time: '2015-01-02T00:00:00.000Z', count: 1 },
                { time: '2015-01-03T00:00:00.000Z', count: 2 },
                { time: '2015-01-04T00:00:00.000Z', count: 3 }
            ];
            expect(result.sinks.table).deep.equal(expected);
        });
    });

    it('handles pure live mode with a default lag', function() {
        return check_juttle({
            program: 'read testTimeseries -to :end: ' +
                '| put dtProg = Math.floor(Duration.seconds(time - :now:)) ' +
                '| put dtReal = Math.floor(Duration.seconds(Date.time() - time)) ' +
                '| keep count, dtProg, dtReal',
            realtime: true
        }, 3000)
        .then(function(result) {
            var expected = [
                { count: 0, dtProg: 0, dtReal: 1 },
                { count: 1, dtProg: 1, dtReal: 1 },
                { count: 2, dtProg: 2, dtReal: 1 }
            ];
            expect(result.sinks.table).deep.equal(expected);
        });
    });

    it('handles pure live mode with a configurable lag', function() {
        this.timeout(10000);
        return check_juttle({
            program: 'read testTimeseries -to :end: -lag :2s: ' +
                '| put dtProg = Math.floor(Duration.seconds(time - :now:)) ' +
                '| put dtReal = Math.floor(Duration.seconds(Date.time() - time)) ' +
                '| keep count, dtProg, dtReal',
            realtime: true
        }, 5000)
        .then(function(result) {
            var expected = [
                { count: 0, dtProg: 0, dtReal: 3 },
                { count: 1, dtProg: 1, dtReal: 3 },
                { count: 2, dtProg: 2, dtReal: 3 }
            ];
            expect(result.sinks.table).deep.equal(expected);
        });
    });

    it('properly emits ticks in live mode', function() {
        this.timeout(10000);
        return check_juttle({
            program: 'read testTimeseries -to :end: -every :2s: -lag :0s:' +
                '| put dtProg = Math.floor(Duration.seconds(time - :now:)) ' +
                '| put dtReal = Math.floor(Duration.seconds(Date.time() - time)) ' +
                '| keep count, dtProg, dtReal' +
                '| view result -ticks true -dt true',
            realtime: true
        }, 4000)
        .then(function(result) {
            var expected = [
                { count: 0, dtProg: 0, dtReal: 2 },
                { tick: true, dt: '00:00:01.000'},
                { count: 1, dtProg: 2, dtReal: 2 },
                { tick: true, dt: '00:00:03.000'}
            ];
            expect(result.sinks.result).deep.equal(expected);
        });
    });

    it('handles mixed historical and live mode', function() {
        this.timeout(10000);
        return check_juttle({
            program: 'read testTimeseries -from :-2s: -to :end:' +
                '| put dtProg = Math.floor(Duration.seconds(time - :now:)) ' +
                '| put dtReal = Math.floor(Duration.seconds(Date.time() - time)) ' +
                '| keep count, dtProg, dtReal',
            realtime: true
        }, 3000)
        .then(function(result) {
            var expected = [
                { count: 0, dtProg: -2, dtReal: 2 },
                { count: 1, dtProg: -1, dtReal: 1 },
                { count: 2, dtProg: 0, dtReal: 1 },
                { count: 3, dtProg: 1, dtReal: 1 },
                { count: 4, dtProg: 2, dtReal: 1 }
            ];
            expect(result.sinks.table).deep.equal(expected);
        });
    });
});

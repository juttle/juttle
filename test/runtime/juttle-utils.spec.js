'use strict';

var expect = require('chai').expect;
var utils = require('../../lib/runtime/juttle-utils');
var JuttleMoment = require('../../lib/runtime/types/juttle-moment');

describe('juttle utils tests', function() {
    describe('fromNative', function() {
        it('serializes juttle moments in points', function() {
            var time = new JuttleMoment(0);

            var points = [
                { time: time, arr: [time], obj: {time: time}  }
            ];

            var converted = utils.fromNative(points)[0];

            expect(converted.time).to.equal(time.valueOf());
            expect(converted.arr[0]).to.equal(time.valueOf());
            expect(converted.obj.time).to.equal(time.valueOf());
        });
    });

    describe('toNative', function() {
        it('converts Date to JuttleMoment', function() {
            var time = new Date(2000);

            var points = [
                { time: time }
            ];

            var converted = utils.toNative(points)[0];

            expect(converted.time).instanceOf(JuttleMoment);
            expect(converted.time.unixms()).to.equal(time.getTime());
        });

        it('converts ISO string to JuttleMoment', function() {
            var time = new Date(2000);

            var points = [
                { time: time.toISOString() }
            ];

            var converted = utils.toNative(points)[0];

            expect(converted.time).instanceOf(JuttleMoment);
            expect(converted.time.unixms()).to.equal(time.getTime());
        });

        it('converts seconds to JuttleMoment', function() {
            var seconds = 2;
            var time = new Date(seconds * 1000);

            var points = [
                { time: seconds }
            ];

            var converted = utils.toNative(points)[0];

            expect(converted.time).instanceOf(JuttleMoment);
            expect(converted.time.unixms()).to.equal(time.getTime());
        });
    });
});

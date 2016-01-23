'use strict';

var expect = require('chai').expect;
var utils = require('../../lib/runtime/juttle-utils');
var JuttleMoment = require('../../lib/moment').JuttleMoment;

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
});

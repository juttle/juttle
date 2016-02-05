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

    describe('parseTime', function() {
        it('parses a timeField correctly and removes it from resulting data', function() {
            var points;
            return new Promise((resolve, reject) => {
                points = utils.parseTime([
                    { foo: '2014-01-01T00:00:00.000Z'},
                    { foo: '2015-01-01T00:00:00.000Z'}
                ], 'foo', {
                    trigger: (type, error) => { 
                        reject(error);
                    }
                });
                resolve();
            })
            .then(() => {
                expect(points).to.deep.equal([
                    {
                        time: new JuttleMoment({
                            rawDate: new Date('2014-01-01T00:00:00.000Z')
                        })
                    },
                    {
                        time: new JuttleMoment({
                            rawDate: new Date('2015-01-01T00:00:00.000Z')
                        })
                    }
                ]);
            });
        });

        it('warns if any points is missing the timeField', function() {
            var points;
            return new Promise((resolve) => {
                points = utils.parseTime([{ foo: 1 }, {},  { foo: 3 }], 'foo', {
                    trigger: function(type, error) { 
                        expect(type).to.equal('warning');
                        expect(error.toString()).to.match(/point is missing a time in foo/);
                        resolve();
                    }
                });
            })
            .then(() => {
                expect(points).to.deep.equal([
                    { time: new JuttleMoment({ rawDate: new Date('1970-01-01T00:00:01.000Z') }) },
                    {},
                    { time: new JuttleMoment({ rawDate: new Date('1970-01-01T00:00:03.000Z') }) }
                ]);
            });
        });
    }); 
});

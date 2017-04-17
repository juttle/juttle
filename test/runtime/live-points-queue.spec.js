var _ = require('underscore');
var expect = require('chai').expect;
var LivePointsQueue = require('../../lib/runtime/live-points-queue');
var Scheduler = require('../../lib/runtime/scheduler').Scheduler;
var JuttleMoment = require('../../lib/moment').JuttleMoment;

// Durations helper
var durations  = {};
_.each([5, 10, 15, 20, 25, 30, 100, 120, 150], function(duration) {
    durations['_' + duration + 'ms'] = new JuttleMoment.duration(duration, 'ms');
});

// Override _now to get a deterministic initial time
var t0 = new JuttleMoment(0);
var LivePointsQueue = LivePointsQueue.extend({
    _now: function() {
        return t0;
    }
});

describe('Live points queue', function() {
    var scheduler = new Scheduler();

    before(function() {
        scheduler.start();
    });

    after(function() {
        scheduler.stop();
    });

    it('adds points', function(done) {
        var queue = new LivePointsQueue(scheduler, {
            every: durations._25ms,
            delay: durations._100ms,
        });

        queue.on('points', function(points) {
            queue.stop();
            expect(points.length).to.equal(2);
            done();
        });

        queue.start();
        queue.add([{time: t0.add(durations._10ms), key: "value1"}]);
        queue.add([{time: t0.add(durations._20ms), key: "value2"}]);
    });

    it('sorts points', function(done) {
        var queue = new LivePointsQueue(scheduler, {
            every: durations._25ms,
            delay: durations._100ms
        });

        queue.on('points', function(points) {
            queue.stop();
            expect(points.length).to.equal(2);
            expect(points[1].time.gte(points[0].time)).to.equal(true);
            done();
        });

        queue.start();
        queue.add([{time: t0.add(durations._15ms), key: "value2"}]);
        queue.add([{time: t0.add(durations._5ms), key: "value1"}]);
    });

    it('emits points continuously', function(done) {
        var queue = new LivePointsQueue(scheduler, {
            every: durations._25ms,
            delay: durations._100ms
        });
        var calls = 0;

        queue.on('points', function(points) {
            if (calls === 0) {
                expect(points.length).to.equal(2);
            } else if (calls === 1) {
                queue.stop();
                expect(points.length).to.equal(1);
                done();
            }

            calls += 1;
        });

        queue.start();
        queue.add([{time: t0.add(durations._20ms), key: "value1"}]);
        queue.add([{time: t0.add(durations._15ms), key: "value2"}]);
        queue.add([{time: t0.add(durations._120ms), key: "value3"}]);
    });

    it('correctly mixes ticks and points', function(done) {
        var queue = new LivePointsQueue(scheduler, {
            every: durations._25ms,
            delay: durations._100ms
        });

        var history = [];
        var expected = ['tick', 'point', 'tick', 'tick', 'point'];

        queue.on('tick', function() {
            history.push('tick');

            if (history.length >= expected.length) {
                queue.stop();
                expect(history).to.deep.equal(expected);
                done();
            }
        });

        queue.on('points', function() {
            history.push('point');

            if (history.length >= expected.length) {
                queue.stop();
                expect(history).to.deep.equal(expected);
                done();
            }
        });

        queue.start();

        // expected: ['tick', 'point', 'tick', 'tick', 'point'];
        // points:             30ms                     120ms
        // scheduler:  25ms         50ms  75ms  100ms         125ms
        queue.add([{time: t0.add(durations._30ms), key: "value1"}]);
        queue.add([{time: t0.add(durations._120ms), key: "value2"}]);
    });

    it('drops the oldest point when over limit', function(done) {
        var queue = new LivePointsQueue(scheduler, {
            every: durations._25ms,
            delay: durations._100ms,
            heap_size_limit: 2
        });

        queue.on('drop', function(point) {
            queue.stop();
            expect(point.time.unixms()).to.equal(5);
            done();
        });

        queue.start();
        queue.add([{time: t0.add(durations._5ms), key: "value1"}]);
        queue.add([{time: t0.add(durations._10ms), key: "value2"}]);
        queue.add([{time: t0.add(durations._15ms), key: "value3"}]);
    });
});

var _ = require('underscore');

var Base = require('extendable-base');
var Heap = require('heap');
var Events = require('backbone').Events;

var JuttleMoment = require('../moment').JuttleMoment;
var JuttleUtils = require('./juttle-utils');

var timeSort = JuttleUtils.pointSortFunc('time');

// LivePointsQueue stores incoming points over a configurable time window and
// emits them sorted in predefined intervals. This smooths out out-of-order points
// from live sources and maintains the 'monotonic-time' invariant of the points.
//
// The points are passed into the buffer via push, then periodically emitted
// via the `points` event. If there are no points in a given time period,
// `tick` event is emitted.
// Points arriving late/out of order are dropped - `drop` event is fired for each
// of those.
var LivePointsQueue = Base.extend(Events).extend({
    initialize: function(scheduler, options) {
        this.scheduler = scheduler;

        this.every = options.every || JuttleMoment.duration('1', 's');
        this.delay = options.delay || JuttleMoment.duration('5', 's');

        this.next_emit_time = null;
        this.window_start_time = null;

        this.heap = new Heap(timeSort);
        this.heap_size_limit = options.heap_size_limit || 100000;
    },

    start: function() {
        this.next_emit_time = this._now().quantize(this.every).add(this.delay);
        this.window_start_time = this._now().quantize(this.every);
        this.scheduler.schedule(this.next_emit_time.unixms(), this._emit.bind(this));
    },

    stop: function() {
        this.next_emit_time = null;
        this.window_start_time = null;
    },

    add: function(points) {
        var self = this;

        _.each(points, function(point) {
            if (self._isLate(point)) {
                self.trigger('drop', point);
            } else {
                self.heap.push(point);
            }

            if (self.heap.size() > self.heap_size_limit) {
                var oldest_point = self.heap.pop();
                self.trigger('drop', oldest_point);
            }
        });
    },

    // If any point arrives before the window starts, it is dropped - this
    // maintains the 'points ordered by time' invariant in the flowgraph.
    // If the queue has not been yet started, drop all points.
    _isLate: function(point) {
        if (this._isRunning()) {
            return point.time.lt(this.window_start_time);
        } else {
            return true;
        }
    },

    _isRunning: function() {
        return this.next_emit_time !== null;
    },

    _emit: function() {
        if (!this._isRunning()) { return; }

        this.window_start_time = this.window_start_time.add(this.every);
        this._emitWhile(this._pointsPending.bind(this));

        // Guard against a stop call since the last check at the beginning of _emit
        if (!this._isRunning()) { return; }

        this.next_emit_time = this.next_emit_time.add(this.every);
        this.scheduler.schedule(this.next_emit_time.unixms(), this._emit.bind(this));
    },

    _pointsPending: function() {
        return this.heap.size() !== 0 && this.heap.peek().time.lte(this.window_start_time);
    },

    _emitWhile: function(until) {
        var points = [];

        while (until()) {
            points.push(this.heap.pop());
        }

        if (points.length === 0) {
            this.trigger('tick');
        } else {
            this.trigger('points', points);
        }
    },

    // This can be overridden by the tests, so that we get a deterministic t0
    _now: function() {
        return new JuttleMoment();
    }
});

module.exports = LivePointsQueue;

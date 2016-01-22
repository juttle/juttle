'use strict';

var Heap = require('heap');
var Base = require('extendable-base');

var Scheduler = Base.extend({
    initialize: function(options) {
        this.timer = null;
        this.queue = new Heap(function(a, b) { return a.ms - b.ms; });
    },

    now: function() {
        return Date.now();
    },

    schedule: function(time, callback) {
        this.queue.push({ms:time, callback:callback});
        if (this.timer) { clearTimeout(this.timer); }
        this._run_after(0);
    },

    start: function() {
        this._run_after(0);
    },

    stop: function() {
        if (this.timer) { clearTimeout(this.timer); }
    },

    _run: function() {
        var now = this.now();
        var peek;
        while ((peek = this.queue.peek()) && peek.ms <= now) {
            this.queue.pop().callback();
        }
        if (peek) {
            this._run_after(Math.max(peek.ms - now, 0));
        }
    },

    _run_after: function(delay) {
        var self = this;
        this.timer = setTimeout(function() { self._run(); }, delay);
    },
});

var TestScheduler = Scheduler.extend({
    // All points in the past means no delays between events
    now: function() { return Infinity; }
});

module.exports = {
    Scheduler:Scheduler,
    TestScheduler:TestScheduler
};

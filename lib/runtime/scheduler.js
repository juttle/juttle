var Heap = require('heap');
var Base = require('extendable-base');
var errors = require('../errors');

var State = {
    INIT: 0,
    RUNNING: 1,
    STOPPED: 2
};

var Scheduler = Base.extend({
    initialize: function(options) {
        this.timer = null;
        this.queue = new Heap(function(a, b) { return a.ms - b.ms; });

        this.state = State.INIT;
    },

    now: function() {
        return Date.now();
    },

    schedule: function(time, callback) {
        if (this.state === State.STOPPED) {
            throw errors.runtimeError('RT-CANNOT-SCHEDULE-AFTER-STOP');
        }

        this.queue.push({ms:time, callback:callback});

        if (this.state === State.RUNNING) {
            if (this.timer !== null) {
                clearTimeout(this.timer);
                this.timer = null;
            }
            this._run_after(0);
        }
    },

    schedule_every: function(every, callback) {
        var self = this;

        if (this.state === State.STOPPED) {
            throw errors.runtimeError('RT-CANNOT-SCHEDULE-AFTER-STOP');
        }

        var job = function() {
            if (self.state === State.RUNNING) {
                callback();
                if (self.state === State.RUNNING) {
                    self.schedule(Date.now() + every, job);
                }
            }
        };

        this.schedule(Date.now() + every, job);
    },

    start: function() {
        if (this.state !== State.RUNNING) {
            this.state = State.RUNNING;
            this._run_after(0);
        }
    },

    stop: function() {
        this.state = State.STOPPED;
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },

    _run: function() {
        var now = this.now();
        var peek;

        // Scheduler was stopped after previous tick and before this one
        if (this.state !== State.RUNNING) { return; }

        while ((peek = this.queue.peek()) && peek.ms <= now) {
            this.queue.pop().callback();
        }

        if (peek) {
            this._run_after(Math.max(peek.ms - now, 0));
        }
    },

    _run_after: function(delay) {
        this.timer = setTimeout(this._run.bind(this), delay);
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

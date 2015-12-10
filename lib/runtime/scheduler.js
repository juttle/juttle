var Heap = require('heap');
var Base = require('extendable-base');

var Scheduler = Base.extend({
    initialize: function(options) {
        this.timer = null;
        this.queue = new Heap(function(a, b) { return a.ms - b.ms; });
        this.running = false;
    },

    now: function() {
        return Date.now();
    },

    schedule: function(time, callback) {
        this.queue.push({ms:time, callback:callback});

        if (this.running === true) {
            if (this.timer !== null) {
                clearTimeout(this.timer);
                this.timer = null;
            }

            this._run_after(0);
        }
    },

    schedule_every: function(every, callback) {
        var self = this;

        var job = function() {
            if (self.running === true) {
                callback();
                self.schedule(Date.now() + every, job);
            }
        };

        this.schedule(Date.now() + every, job);
    },

    start: function() {
        this._run_after(0);
        this.running = true;
    },

    stop: function() {
        this.running = false;
        if (this.timer !== null) {
            clearTimeout(this.timer);
            this.timer = null;
        }
    },

    _run: function() {
        var now = this.now();
        var peek;

        // Scheduler was stopped after previous tick and before this one
        if (this.running === false) { return; }

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

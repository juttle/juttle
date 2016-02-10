'use strict';

var Heap = require('heap');
class Scheduler {
    constructor(options) {
        this.timer = null;
        this.queue = new Heap(function(a, b) { return a.ms - b.ms; });
    }

    now() {
        return Date.now();
    }

    schedule(time, callback) {
        this.queue.push({ms:time, callback:callback});
        if (this.timer) { clearTimeout(this.timer); }
        this._run_after(0);
    }

    start() {
        this._run_after(0);
    }

    stop() {
        if (this.timer) { clearTimeout(this.timer); }
    }

    _run() {
        var now = this.now();
        var peek;
        while ((peek = this.queue.peek()) && peek.ms <= now) {
            this.queue.pop().callback();
        }
        if (peek) {
            this._run_after(Math.max(peek.ms - now, 0));
        }
    }

    _run_after(delay) {
        var self = this;
        this.timer = setTimeout(function() { self._run(); }, delay);
    }
}class TestScheduler extends Scheduler {
    // All points in the past means no delays between events
    now() { return Infinity; }
}

module.exports = {
    Scheduler:Scheduler,
    TestScheduler:TestScheduler
};

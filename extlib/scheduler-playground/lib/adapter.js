var _ = require('underscore');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Adapter = function(options) {
    EventEmitter.call(this);

    // Our data queue.
    this.queue = [];

    // The max queue size
    this.queueLimit = options.queueLimit;

    // time it takes to get points
    this.latency = options.latency;

    // Data store backing this adapter
    this.store = options.store;

    // In flight?
    this.running = false;
};

util.inherits(Adapter, EventEmitter);

Adapter.prototype.fetch = function(from, to) {
    var self = this;
    this.running = true;

    // Simulate latency
    this.tick = setTimeout(function() {
        clearTimeout(self.tick);

        // Never fetch more than what can fit into the queue
        var limit = self.queueLimit - self.queue.length;

        if (limit === 0) {
            self.emit('full');
        } else {
            var points = self.store.fetch(from, to, limit)

            self.queue = self.queue.concat(points);

            self.emit('fetch', {
                qlength: self.queue.length,
                limit: self.queueLimit,
                size: points.length,
                to: new Date(to.getTime()),
                head: self.queue[0],
                tail: self.queue[self.queue.length - 1]
            });
        }

        self.running = false;
    }, this.latency);
};

Adapter.prototype.drain = function(to) {
    var points = [];
    var first = this.queue[0];

    while (first && first.time.getTime() <= to.getTime()) {
        points.push(this.queue.shift());
        first = this.queue[0];
    }

    if (points.length !== 0) {
        this.emit('drain', {
            qlength: this.queue.length,
            size: points.length,
            head: points[0],
            tail: points[points.length - 1]
        });
    }
};

module.exports = Adapter;

var _ = require('underscore');

var util = require('util');
var EventEmitter = require('events').EventEmitter;

var Store = function(options) {
    EventEmitter.call(this);

    // First and last points in the store
    this.last  = new Date(options.last.getTime());
    this.first = new Date(options.first.getTime());

    // Points per second (data density)
    this.density = options.density;

    this.data = [];

    this.init();
    this.live = options.live;

    if (this.live) {
        this.tick = null;
        this.stream();
    }
};

util.inherits(Store, EventEmitter);

Store.prototype.init = function() {
    var range = this.last.getTime() - this.first.getTime();
    var maxPoints = (range / 1000) * this.density;

    while (this.data.length < maxPoints) {
        this.data.push({ time: new Date(Math.floor(this.first.getTime() + (Math.random() * range))) });
    }

    this.data.sort(function(a, b) { return a.time.getTime() - b.time.getTime(); });
};

Store.prototype.stream = function() {
    var self = this;
    var now = Date.now();

    // this.data is sorted
    var next_point = _.find(this.data, function(p) {
        return p.time.getTime() > now;
    });

    clearTimeout(this.tick);

    if (!next_point) { return; }

    this.tick = setTimeout(function() {
        self.emit('point', next_point);
        self.stream();
    }, (next_point.time.getTime() - now));
};

Store.prototype.fetch = function(from, to, limit) {
    var ft = from.getTime(), tt = to.getTime();

    var points = _.filter(this.data, function(point) {
        var pt = point.time.getTime();
        return (pt >= ft && pt < tt);
    });

    return _.first(points, limit);
};

module.exports = Store;

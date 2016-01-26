var _ = require('underscore');

var Store = function(options) {
    // First and last points in the store
    this.last  = new Date(options.last.getTime());
    this.first = new Date(options.first.getTime());

    // Points per second (data density)
    this.density = options.density;

    this.data = [];

    this.init();
};

Store.prototype.init = function() {
    var range = this.last.getTime() - this.first.getTime();
    var maxPoints = (range / 1000) * this.density;

    while (this.data.length < maxPoints) {
        this.data.push({ time: new Date(Math.floor(this.first.getTime() + (Math.random() * range))) });
    }

    this.data.sort(function(a, b) { return a.time.getTime() - b.time.getTime(); });
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

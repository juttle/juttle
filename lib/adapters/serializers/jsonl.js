var _ = require('underscore');
var base = require('./base');

module.exports = base.extend({
    write: function(points) {
        var self = this;
        _.each(points, function(point) {
            self.stream.write(JSON.stringify(point) + '\n');
        });
    },
});

var _ = require('underscore');
var base = require('./base');

module.exports = base.extend({

    initialize: function(stream, options) {
        this.firstPoint = true;
        this.pointBefore = false;
    },

    write: function(points) {
        var self = this;

        if (this.firstPoint) {
            this.stream.write('[\n');
            this.firstPoint = false;
        }

        _.each(points, function(point) {
            if (self.pointBefore) {
                self.stream.write(',\n');
            }
            self.stream.write(JSON.stringify(point));
            self.pointBefore = true;
        });
    },

    done: function() {
        if (this.pointBefore) {
            this.stream.write('\n]');
        }
    }
});

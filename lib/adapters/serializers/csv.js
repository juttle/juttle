var _ = require('underscore');
var base = require('./base');
var csv = require('csv-write-stream');
var errors = require('../../errors');

module.exports = base.extend({

    write: function(points) {
        var self = this;

        _.each(points, function(point) {
            var keys = _.keys(point);

            if (!self.headers) {
                self.headers = keys;
                self.csvWriter = csv({
                    sendHeaders: true,
                    headers: self.headers
                });
                self.csvWriter.pipe(self.stream);
            }

            var diff = _.difference(keys, self.headers);
            if (diff.length > 0) {
                self.emit('error', errors.runtimeError('RT-INVALID-CSV-ERROR',{
                    detail: 'Found new or missing fields: ' + diff
                }));
            }

            self.csvWriter.write(point);
        });
    },

    done: function() {
        if (this.csvWriter) {
            this.csvWriter.end();
        }
    }
});

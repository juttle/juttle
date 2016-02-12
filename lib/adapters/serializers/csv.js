'use strict';

var _ = require('underscore');
var base = require('./base');
var csv = require('csv-write-stream');
var errors = require('../../errors');
var values = require('../../runtime/values');

var CSVSerializer = base.extend({

    write: function(points) {
        var self = this;

        _.each(points, function(point) {
            var keys = _.keys(point);

            _.each(point, function(value, key) {
                if (values.isArray(value) || values.isObject(value)) {
                    point[key] = JSON.stringify(value);
                }
            });

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
                self.emit('error', errors.runtimeError('INVALID-CSV',{
                    detail: 'Found new or missing fields: ' + diff
                }));
            } else {
                self.csvWriter.write(point);
            }
        });
    },

    done: function() {
        return new Promise((resolve) => {
            if (this.csvWriter) {
                this.csvWriter.end(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }
});

module.exports = CSVSerializer;

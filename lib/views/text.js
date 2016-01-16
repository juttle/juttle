/* jslint node:true */
var _ = require('underscore');
var babyparse = require('babyparse');
var View = require('./view.js');
var utils = require('../runtime').utils;
var values = require('../runtime/values');

var TextView = View.extend({
    name: 'text',

    initialize: function(options) {

        this.options = _.clone(options);
        this.options.format = this.options.format || 'json';

        // Emulate the behavior of the browser text view. If
        // format is 'raw', and marks is not
        // explicitly specified, set it to true
        if (this.options.format === 'raw' &&
            this.options.marks === undefined) {
            this.options.marks = true;
        }

        if (this.options.indent) {
            this.indentation = new Array(options.indent + 1).join(' ');
        }

        this.tick_text = '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ';
        this.mark_text = '--------------------------------------------------------------';
        this.eof_text = '==============================================================';
        this.initial_keys = [];
        this.latest_keys = [];
        this.items_written = 0;
        this.buffer = '';
    },

    write: function(data) {
        if (this.options.progressive) {
            this.fstream.write(data);
        } else {
            this.buffer += data;
        }
    },

    write_item: function(item, skip_newline) {
        var self = this;
        skip_newline = skip_newline || false;

        if (self.options.limit && self.items_written >= self.options.limit) {
            return;
        }

        self.items_written++;

        this.write(item);

        if (!skip_newline) {
            this.write('\n');
        }
    },

    always_write_item: function(item, skip_newline) {
        this.write(item);

        if (!skip_newline) {
            this.write('\n');
        }
    },

    format_values: function(values_) {
        var val2 = _.map(values_, function(value) {
            if (typeof(value) === 'undefined') {
                return '';
            } else if (values.isArray(value) || values.isObject(value)) {
                return values.inspect(value);
            } else {
                return values.toString(value);
            }
        });
        return babyparse.unparse([val2], {quotes: true});
    },

    format_point: function(point) {
        var self = this;

        switch (self.options.format) {
            case 'raw':
                self.write_item(JSON.stringify(point, null, 0));
                break;

            case 'csv':
            // If all keys in point are already found in fields, simply
            // emit the values for each key in fields.
                if (self.initial_keys.length === 0) {
                self.initial_keys = _.keys(point);
                self.latest_keys = _.keys(point);
                self.write_item(self.format_values(self.initial_keys));
            }

                var new_keys = _.difference(_.keys(point).sort(), self.latest_keys);
                if (new_keys.length > 0) {
                self.warn('Ignoring new point key(s) "' + new_keys.join(',') + '"');
                self.latest_keys = self.latest_keys.concat(new_keys).sort();
            }
                var values_ = _.map(self.initial_keys, function(key) {
                return point[key];
            });
                self.write_item(self.format_values(values_));
                break;

            case 'json':
                if (self.items_written === 0) {
                self.always_write_item('[');
            }
                var text = JSON.stringify(point, null, self.options.indent);
                if (self.options.indent) {
                text = text.replace(/^/gm, self.indentation);
            }

            // If this is not the first item, add a comma
                if (self.items_written !== 0 && self.items_written !== self.options.limit) {
                self.always_write_item(',');
            }

                self.write_item(text, true);
                break;

        // jsonlines http://jsonlines.org/
            case 'jsonl':
                self.write_item(JSON.stringify(point, null));
                break;
        }
    },
    consume: function(data) {
        var self = this;

        utils.fromNative(data.map(_.clone)).forEach(function(point) {
            self.format_point(point);
        });
    },

    // This is called when a batch finishes
    mark: function(time) {
        var self = this;

        if (!self.options.marks || self.options.format !== 'raw') {
            return;
        }

        var text = self.mark_text;
        if (self.options.times) {
            text += time.valueOf();
        }

        self.write_item(text);
    },

    // Called for ticks
    tick: function(time) {
        var self = this;

        if (!self.options.ticks || self.options.format !== 'raw') {
            return;
        }

        var text = self.tick_text;
        if (self.options.times) {
            text += time.valueOf();
        }

        self.write_item(text);
    },

    // Called when the stream finishes
    eof: function() {
        var self = this;

        if (self.options.format === 'raw') {
            self.write_item(self.eof_text);
        } else if (self.options.format === 'json') {
            if (self.items_written === 0) {
                self.always_write_item('[');
            }

            self.always_write_item('\n]');
        }

        // Flush the buffer and wait for it (and any prior
        // writes) to flush before emitting the end event.
        // In progressive mode, the buffer is empty.
        self.fstream.write(self.buffer, function() {
            self.events.trigger('end');
        });
    }
});

module.exports = TextView;

/* jslint node:true */
var _ = require('underscore');
var Table = require('cli-table');
var ClientSink = require('./client-sink.js');
var utils = require('../runtime').utils;

var TableSink = ClientSink.extend({
    initialize: function(options) {

        this.options = _.defaults({}, options, {
            columnOrder: ['time', 'name', 'value']
        });

        this.items_written = 0;

        this.data_points = [];
        this.initial_keys = [];
        this.latest_keys = [];
        this.column_widths = [];

        // To allow for seamless-looking tables with incremental
        // outputs, we use different sets of border characters for the
        // first table (containing the column headers + first data
        // point), interior tables (containing data points), and the
        // last table (containing the bottom edge of the table). The
        // first two tables have no 'bottom' characters, and the last
        // table has no 'top' characters.
        this.first_table_chars = {
            'top': '─',
            'top-mid': '┬',
            'top-left': '┌',
            'top-right': '┐',
            'bottom': '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            'left': '│',
            'left-mid': '├',
            'mid': '─',
            'mid-mid': '┼',
            'right': '│',
            'right-mid': '┤',
            'middle': '│'
        };

        this.mid_table_chars = {
            'top': '─',
            'top-mid': '┼',
            'top-left': '├',
            'top-right': '┤',
            'bottom': '',
            'bottom-mid': '',
            'bottom-left': '',
            'bottom-right': '',
            'left': '│',
            'left-mid': '├',
            'mid': '─',
            'mid-mid': '┼',
            'right': '│',
            'right-mid': '┤',
            'middle': '│'
        };

        this.last_table_chars = {
            'top': '',
            'top-mid': '',
            'top-left': '',
            'top-right': '',
            'bottom': '─',
            'bottom-mid': '┴',
            'bottom-left': '└',
            'bottom-right': '┘',
            'left': '│',
            'left-mid': '├',
            'mid': '─',
            'mid-mid': '┼',
            'right': '│',
            'right-mid': '┤',
            'middle': '│'
        };

        if (!this.env.color) {
            this.style = {
                head: [],
                border: []
            };
        } else {
            this.style = {};
        }
    },

    // Used to sort keys in a point in a manner that honors
    // columnOrder first, alphabetical second.
    sort_keys: function(a, b) {
        var self = this;

        var ai = _.indexOf(self.options.columnOrder, a);
        var bi = _.indexOf(self.options.columnOrder, b);

        if (ai === -1 && bi === -1) {
            return a.localeCompare(b);
        } else if (ai === -1 && bi !== -1) {
            return 1;
        } else if (ai !== -1 && bi === -1) {
            return -1;
        } else {
            return (ai - bi);
        }
    },

    consume: function(data) {
        var self = this;

        // If in progressive output, print a tablelet for the column
        // headers and first point, or a tablelet for the points.
        if (self.options.progressive) {
            var table;

            this.data_points = utils.fromNative(data.map(_.clone)).forEach(function(point) {

                if (self.options.limit && self.items_written >= self.options.limit) {
                    return;
                }

                self.items_written++;

                if (self.initial_keys.length === 0) {

                    // This is the first point ever. Save the keys in
                    // this point as the columns, and use the greater
                    // of the width of the keys or values for this
                    // point as a hint on the width of each column.

                    self.initial_keys = _.keys(point).sort(self.sort_keys.bind(self));
                    self.latest_keys = self.initial_keys;
                    self.column_widths = _.map(self.latest_keys, function(key) {
                        var value_len = String(point[key]).length;
                        var key_len = String(key).length;
                        var new_len = Math.ceil(1.5 * Math.max(key_len, value_len));
                        if (new_len < 10) {
                            new_len = 10;
                        }
                        return new_len;
                    });
                    table = new Table({
                        head: self.latest_keys,
                        colWidths: self.column_widths,
                        chars: self.first_table_chars,
                        style: self.style
                    });

                    if (self.options.title) {
                        self.fstream.write(self.options.title + "\n");
                    }
                } else if (table === undefined) {
                    // This is not the first point ever, but the first
                    // point for this batch. Create a table to hold
                    // the points.
                    table = new Table({
                        colWidths: self.column_widths,
                        chars: self.mid_table_chars,
                        style: self.style
                    });
                }

                // If this point has additional keys, emit a warning
                // and ignore the additional keys.
                var new_keys = _.difference(_.keys(point).sort(self.sort_keys.bind(self)), self.latest_keys);
                if (new_keys.length > 0) {
                    self.warn("Ignoring new point key(s) \"" + new_keys.join(",") + "\"");
                    self.latest_keys = self.latest_keys.concat(new_keys).sort(self.sort_keys.bind(self));
                }
                var values = _.map(self.initial_keys, function(key) {
                    return (_.has(point, key) ? point[key] : '');
                });
                table.push(values.map(self._valueFormatter.bind(self)));
            });
            if (table !== undefined) {
                // Print the table, if it exists. It won't exist only
                // if we've hit limit.
                self.fstream.write(table.toString() + "\n");
            }
        } else {
            // We're not in progressive mode. Just save the points so
            // we can build the big table at the end.
            this.data_points = this.data_points.concat(utils.fromNative(data.map(_.clone)));
        }
    },

    // Called when the stream finishes
    eof: function() {
        var self = this;
        var table;

        if (! self.options.progressive) {

            // Get all the keys from all the points and sort them to
            // get the column names.
            var keys = _.reduce(self.data_points, function(memo, pt) {
                return _.union(memo, _.keys(pt));
            }, []);

            keys.sort(self.sort_keys.bind(self));

            table = new Table({
                head: keys,
                style: self.style
            });

            // Add up to .limit points, slotting the values
            // into the appropriate columns.
            self.data_points.forEach(function(point) {
                if (self.options.limit && self.items_written >= self.options.limit) {
                    return;
                }
                self.items_written++;
                var values = _.map(keys, function(key) {
                    return (_.has(point, key) ? point[key] : '');
                });
                table.push(values.map(self._valueFormatter.bind(self)));
            });

            if (self.title) {
                self.fstream.write(self.title + "\n");
            }
            self.fstream.write(table.toString() + "\n");
        } else {
            // Print a tablelet containing only the bottom edge of the table.
            table = new Table({
                chars: self.last_table_chars,
                colWidths: self.column_widths,
                style: self.style
            });
            table.push([]);
            self.fstream.write(table.toString() + "\n");
        }

        self.events.trigger('end');
    },

    _valueFormatter: function(value) {
        return value === null ? '' : value;
    },
});

module.exports = TableSink;

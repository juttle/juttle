'use strict';

/* jslint node:true */
var _ = require('underscore');
var Table = require('cli-table');
var View = require('./view');
var values = require('../runtime/values');
var JuttleMoment = require('../runtime/types/juttle-moment');

class TableView extends View {
    constructor(options, env) {
        super(options, env);
        this.name = 'table';

        this.options = _.defaults({}, options, {
            columnOrder: ['time', 'name', 'value']
        });

        this.progressiveDelay = 1000;
        if (this.options.progressive instanceof JuttleMoment) {
            this.progressiveDelay = this.options.progressive.unixms();
        }

        this.items_written = 0;

        this.data_points = [];
        this.columns = null;
        this.keys = [];
        this.column_widths = [];
        this.latest_keys = [];

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
    }

    // Used to sort keys in a point in a manner that honors
    // columnOrder first, alphabetical second.
    sort_keys(a, b) {
        var ai = _.indexOf(this.options.columnOrder, a);
        var bi = _.indexOf(this.options.columnOrder, b);

        if (ai === -1 && bi === -1) {
            return a.localeCompare(b);
        } else if (ai === -1 && bi !== -1) {
            return 1;
        } else if (ai !== -1 && bi === -1) {
            return -1;
        } else {
            return (ai - bi);
        }
    }

    consume(data) {
        if (this.options.limit && this.items_written >= this.options.limit) {
            return;
        }

        this.data_points = this.data_points.concat(data);

        // In progressive mode, delay for a bit after receiving the first few
        // batches of points to detect the columns and determine their widths
        // based on the length of the fields. Then print a tablelet for each
        // batch of points, using the same widths to make things align properly.
        if (this.options.progressive) {
            if (!this.columns && this.progressiveDelay !== 0) {
                if (! this.flushTimer) {
                    this.flushTimer = setTimeout(() => { this.flush(false); }, this.progressiveDelay);
                }
            } else {
                this.flush(false);
            }
        }
    }

    // Go through all the buffered data and calculate the key / length for
    // all the columns.
    get_columns() {
        return _.reduce(this.data_points, function(memo, pt) {
            _.each(pt, function(val, key) {
                var val_len = values.toString(val).length + 2;
                var key_len = String(key).length + 2;
                memo[key] = Math.max(memo[key] || 0, key_len, val_len, 10);
            });
            return memo;
        }, {});
    }

    flush(eof) {
        this.flushTimer = null;
        var table;

        var columns = this.get_columns();
        var keys = _.keys(columns);
        keys.sort(this.sort_keys.bind(this));

        // If we're at eof and either progressive mode is disabled or
        // progressive mode is enabled but we haven't yet flushed anything out,
        // then just render the single table.
        if (eof && ((!this.options.progressive) || this.columns === null)) {
            this.keys = keys;
            this.column_widths = _.map(keys, function(key) {
                return columns[key];
            });

            table = new Table({
                head: keys,
                style: this.style,
                colWidths: this.column_widths
            });

            if (this.options.title) {
                this.fstream.write(this.options.title + '\n');
            }
        }
        // If we're in progressive mode and this is the first set of points,
        // stash the set of columns so we remember what they are and create the
        // tablelet for the beginning.
        else if (this.columns === null) {
            this.columns = columns;
            this.keys = keys;
            this.column_widths = _.map(keys, function(key) {
                return columns[key];
            });
            this.latest_keys = keys;

            table = new Table({
                head: keys,
                colWidths: this.column_widths,
                chars: this.first_table_chars,
                style: this.style
            });

            if (this.options.title) {
                this.fstream.write(this.options.title + '\n');
            }
        }
        // Otherwise emit warnings for any columns that changed and render the
        // rest of the table.
        else {
            var new_keys = _.difference(keys, this.latest_keys);
            if (new_keys.length > 0) {
                this.warn('Ignoring new point key(s) "' + new_keys.join(',') + '"');
                this.latest_keys = this.latest_keys.concat(new_keys);
            }

            table = new Table({
                colWidths: this.column_widths,
                chars: eof ? this.last_table_chars : this.mid_table_chars,
                style: this.style
            });
        }

        if (this.data_points.length === 0) {
            table.push([]);
        } else {
            _.each(this.data_points, (point) => {
                if (this.options.limit && this.items_written >= this.options.limit) {
                    return;
                }

                this.items_written++;
                var values = _.map(this.keys, (key) => {
                    return this._valueFormatter(point[key]);
                });
                table.push(values);
            });
        }
        this.data_points = [];

        this.fstream.write(table.toString() + '\n');
    }

    // Called when the stream finishes. Clear the pending flush timer (if it
    // exists), and flush the buffered data.
    eof() {
        if (this.flushTimer) {
            clearTimeout(this.flushTimer);
        }
        this.flush(true);
        this.events.emit('end');
    }

    _valueFormatter(value) {
        if (typeof(value) === 'undefined') {
            return '';
        } else {
            return values.toString(value);
        }
    }
}

module.exports = TableView;

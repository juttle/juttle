'use strict';

var _ = require('underscore');
var windowMaker = require('./windowmaker');
var fanin = require('./fanin');
var oops_funcs = require('./oops_funcs');
var errors = require('../../errors');
var Groups = require('../groups');
var values = require('../values');

var INFO = {
    type: 'proc',
    options: {   // documented, non-deprecated options only
        over: {},
        acc: {},
        reset: {}
    }
};

var oops_fanin = fanin.extend(oops_funcs);
var put = oops_fanin.extend({
    initialize: function(options, params) {
        var self = this;
        var unknown = _.without(_.keys(options), 'acc', 'groupby', 'over', 'from', 'reset');
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'put',
                option: unknown[0]
            });
        }
        if (options.over && !options.over.duration) {
            throw this.compile_error('RT-DURATION-ERROR', {
                option: 'over',
                value: values.inspect(options.over)
            });
        }
        if (options.from && !options.from.moment) {
            throw this.compile_error('RT-MOMENT-ERROR', {
                option: 'from',
                value: values.inspect(options.from)
            });
        }
        if (options.from && !options.over) {
            throw this.compile_error('RT-FROM-OVER-ERROR', {
                proc: 'put'
            });
        }
        this.expr = params.expr || {};
        this.accumulate = options.acc || (options.reset !== undefined && !options.reset);
        this.over = options.over;
        this.from = options.from;
        this.min_epoch = this.from ? this.from.add(this.over) : null;
        this.groups = new Groups(this, options, params.funcMaker);
        if (this.over) {
            this.groups.funcMakerMaker = function() {
                // each group row will need its own window of points.
                return windowMaker(self.groups.funcMaker, self.over, self.location);
            };
        }
    },
    procName:  'put',
    process: function(points) {
        var k, row, expr = this.expr;
        var out = [];
        for (k = 0; k < points.length; ++k) {
            var pt = _.clone(points[k]);
            row = this.groups.lookup(pt);
            if (this.over) {
                this.groups.reset_row(row);   // prepare to replay the window fresh
            }
            if ((!this.from || pt.time.gte(this.from))
                && (!this.to || pt.time.lt(this.to))) {
                try {
                    this.locate_juttle_errors(function() {
                        expr(pt, row.fns);
                    });
                    if (!this.min_epoch || this.min_epoch.lte(pt.time)) {
                        out.push(pt);
                    } else {
                        // -from tells us to hide results earlier than a full window
                        out.push(_.clone(points[k]));
                    }
                } catch (e) {
                    if (e instanceof errors.RuntimeError) {
                        this.trigger('warning', e);
                    } else {
                        throw e;
                    }
                }
            }
        }
        this.emit(out);
        if (this.over && this.groups.by.length > 0 && points.length > 0) {
            // in windowed group mode, advance all groups to the
            // latest timestamp, and delete any with no data in the
            // current window, to reclaim dead row storage.
            var latest = _.last(points).time;
            var self = this;
            this.groups.apply(function(keyID) {
                var row = self.groups.get_row(keyID);
                row.fns.forEach(function(fn) {
                    fn.advance(latest);
                });
                if (row.fns.is_empty()) {
                    self.groups.delete_group(keyID);
                }
            });
        }
    },
    reset: function() {
        if (this.over) {
            // windowed mode: reset individual rows by calling their funcMakers
            this.groups.reset_fns();
        } else {
            // non-windowed mode: tear down the whole group table and start over
            this.groups.reset_groups();
        }
    },
    mark: function(time, from) {
        if (!this.accumulate) {
            this.reset();
        }
        this.emit_mark(time, from);
    },
    eof: function() {
        this.reset();
        this.emit_eof();
    }
}, {
    info: INFO
});

module.exports = put;

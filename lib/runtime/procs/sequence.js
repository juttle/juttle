'use strict';

var _ = require('underscore');
var fanin = require('./fanin');
var errors = require('../../errors');
var Heap = require('heap');
var Groups = require('../groups');


var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

var sequence = fanin.extend({
    initialize: function(options, params) {
        this.seqno = 0;
        this.predicates = params.predicates;
        this.seq_fieldname = '_seqno';
        this.earliest_in_progress = Infinity;
        this.output_buffer = new Heap(function(p1, p2) {
            return p1.time.milliseconds() - p2.time.milliseconds();
        });
        this.groups = new Groups(this, options);
    },
    procName: function() {
        return 'sequence';
    },

    // For each incoming point, look up group buffer
    // evaluate filters[buffer.len] on point
    //
    //   if true, add point to buffer (making progress in the sequence)
    //
    //      if buffer.len = filters.len, we have a sequence. stamp points
    //      with txn_id and move them to output buffer
    //
    //   if false, drop point
    //
    //   When we complete a matching sequence, we can't (always) emit it right
    //   away, because that could lead to OOO. So we put it in a buffer, and
    //   we emit all the points from that buffer that have a time that is <
    //   than the minumum time of all in-progress sequences.
    process: function(points) {
        var self = this;

        function scan_earliest() {
            var times = _.map(self.groups.table, function(row) {
                return row.pts.length > 0 ? _.first(row.pts).time.milliseconds() : Infinity;
            });
            return times.length === 0 ? Infinity : _.min(times);
        }


        function buffer(pts) {
            _.each(pts, function(pt) {
                pt[self.seq_fieldname]=self.seqno;
                self.output_buffer.push(pt);
            });
            self.seqno++;
        }

        function passes(pt, step) {
            var filter = self.predicates[step];
            var passed;
            try {
                passed = self.locate_juttle_errors(function() {
                    return filter(pt);
                });
            } catch (e) {
                if (e instanceof errors.RuntimeError) {
                    self.trigger('warning', e);
                    passed = false;
                } else {
                    throw e;
                }
            }
            return passed;
        }

        _.each(points, function(pt) {
            var row = self.groups.lookup(pt);
            var t;
            if (!row.pts) {
                row.pts = [];
            }

            if (passes(pt, row.pts.length)) {

                row.pts.push(pt);
                if (row.pts.length === self.predicates.length) {
                    t = row.pts[0].time.milliseconds();
                    buffer(row.pts);
                    row.pts = [];

                    // If the sequence we just removed had the current
                    // earliest time, or if we had no earliest time, re-scan
                    // all in-progress sequences to get the new earliest time
                    if (self.earliest_in_progress === t ||
                        self.earliest_in_progress === Infinity) {
                        self.earliest_in_progress = scan_earliest();
                    }

                    self.try_send();
                }
            }
        });
    },
    try_send: function try_send() {
        var out = [];
        while (!this.output_buffer.empty() && this.output_buffer.peek().time.milliseconds() < this.earliest_in_progress) {
            out.push(this.output_buffer.pop());
        }
        if (out.length > 0) {
            this.emit(out);
        }
    },
    eof: function(from) {
        this.earliest_in_progress = Infinity;
        this.try_send();
        this.emit_eof();
    }
}, {
    info: INFO
});

module.exports = sequence;

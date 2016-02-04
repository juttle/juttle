'use strict';

var _ = require('underscore');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var base = require('./base');
var ExtBase = require('extendable-base');

var DEQueue = require('double-ended-queue');

var Input = ExtBase.extend({
    initialize: function(options, params, location, program) {
        this.from = options.proc;       // input node
        this.queue = new DEQueue();
    },
    pop: function() {
        return this.queue.pop();
    },
    push: function(v) {
        return this.queue.push(v);
    },
    empty: function() {
        return this.queue.isEmpty();
    },
    first: function(i) {
        if (!i) {
            return this.queue.peekFront();
        }
        return this.queue.get(i);
    },
    last: function(i) {
        if (!i) {
            return this.queue.peekBack();
        }
        return this.queue.get(-i-1);
    },
    shift: function() {
        return this.queue.shift();
    },
    length: function() {
        return this.queue.length;
    },
    toArray: function() {
        return this.queue.toArray();
    }
});

var fanin = base.extend({
    // add input-merging behavior to base behavior so everyone
    // knows what to do with multiple inputs in a flowgraph (consume
    // their points in time order, and de-dup marks and ticks)
    initialize: function(options, params, location, program) {
        this.last_mark = JuttleMoment.epsMoment(-Infinity) ;
        this.last_tick = JuttleMoment.epsMoment(-Infinity) ;
        this.last_emitted = JuttleMoment.epsMoment(-Infinity) ;
        this.emitted_eof = false;
    },
    build_input: function(proc) {
        return new Input({proc: proc}) ;
    },
    //
    // upstream inputs feed us points, marks, ticks, and eofs by
    // calling the appropriate consume* methods on their data.  We
    // divert these through per-input process_from, mark_from,
    // tick_from, and eof_from, do a synchronizing merge across all
    // inputs, and ultimately call process, mark, eof on the merged
    // points as if there was a single upstream input feeding
    // them.
    //
    consume: function(points, from) {
        this.stats.points_in += points.length;
        try {
            if (this.ins.length === 1) {
                this.process(points) ;
            } else {
                this.process_from(points, from);
            }
        } catch (err) {
            this.trigger('error', err);
        }
    },
    consume_mark: function(time, from) {
        if (this.ins.length === 1) {
            this.mark(time) ;
        } else {
            this.mark_from(time, from);
        }
    },
    consume_tick: function(time, from) {
        if (this.ins.length === 1) {
            this.tick(time) ;
        } else {
            this.tick_from(time, from);
        }
    },
    consume_eof: function(from) {
        if (this.ins.length === 1) {
            this.eof() ;
        } else {
            this.eof_from(from);
        }
    },
    process_from: function(points, from) {
        if (points.length === 0) {
            return ;
        }
        var self = this;
        _.each(points, function(pt) {
            self.advance_input({time:pt.time, point:pt}, self.in_from(from));});
    },
    mark_from: function(time, from) {
        this.advance_input({time:time, mark:true}, this.in_from(from));
    },
    tick_from: function(time, from) {
        this.advance_input({time:time, tick:true}, this.in_from(from));
    },
    eof_from: function(from) {
        this.advance_input({time: new JuttleMoment(Infinity), eof:true}, this.in_from(from));
    },
    advance_input: function(tpoint, input) {
        input.push(tpoint);
        this.produce();
    },
    earliest: function() {
        // return the input having the earliest itemstamped item, or
        // null. In case of ties, prefer marks so they always go out
        // ahead of points in their batch. An item with no timestamps
        // will be considered earliest of all.
        var earliest = null;
        var earliest_time = null;
        for (var i = 0 ; i < this.ins.length ; i++) {
            var input = this.ins[i];
            if (input.empty()) {
                continue;
            } else if (!earliest) {
                earliest = input;
                earliest_time = input.first().time;
            } else if (!earliest_time) {
                break;
            } else {
                var p = input.first();
                if (!p.time
                    || p.time.lt(earliest_time)
                    || p.time.eq(earliest_time) && p.mark) {
                    earliest = input;
                    earliest_time = p.time;
                }
            }
        }
        return earliest;
    },
    produce: function() {
        // Whenever we have a timestamp present on each input, or a
        // timestamp equal to the most recently emitted timestamp on
        // an input, dequeue the earliest item. Emit it, unless it is
        // a duplicate of the most recent mark or it is a tick (they
        // are no longer realtime once queued). Hold back emitting an
        // eof until all inputs are at eof.
        var earliest = this.earliest();
        while (earliest &&
               (!earliest.first().time
                || earliest.first().time.eq(this.last_emitted)
                || this.ins.every(function backlogged(input) {
                    return !input.empty(); }))) {
            var output = earliest.shift();
            if (output.eof) {
                // backlogged is true, so this only happens when every input is eof
                if (!this.emitted_eof) {
                    this.eof();
                    this.emitted_eof = true;
                }
                break;
            }
            if (output.mark && output.time.gt(this.last_mark)) {
                // de-dup marks
                this.mark(output.time);
                this.last_mark = output.time;
                this.last_emitted = output.time;
            } else if (output.tick && output.time.gt(this.last_tick)) {
                this.tick(output.time);
                this.last_tick = output.time;
                this.last_emitted = output.time ;
            } else if (output.point) {
                this.process([output.point]);
                this.last_emitted = output.time || this.last_emitted; // timeless!
            }
            earliest = this.earliest();
        }
    }
});



module.exports = fanin;

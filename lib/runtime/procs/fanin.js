'use strict';

var _ = require('underscore');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var base = require('./base');

var DEQueue = require('double-ended-queue');

class Input {
    constructor(options, params, location, program) {
        this.from = options.proc;       // input node
        this.queue = new DEQueue();
    }
    pop() {
        return this.queue.pop();
    }
    push(v) {
        return this.queue.push(v);
    }
    empty() {
        return this.queue.isEmpty();
    }
    first(i) {
        if (!i) {
            return this.queue.peekFront();
        }
        return this.queue.get(i);
    }
    last(i) {
        if (!i) {
            return this.queue.peekBack();
        }
        return this.queue.get(-i-1);
    }
    shift() {
        return this.queue.shift();
    }
    length() {
        return this.queue.length;
    }
    toArray() {
        return this.queue.toArray();
    }
}class fanin extends base {
    // add input-merging behavior to base behavior so everyone
    // knows what to do with multiple inputs in a flowgraph (consume
    // their points in time order, and de-dup marks and ticks)
    constructor(options, params, location, program) {
        super(options, params, location, program);
        this.last_mark = JuttleMoment.epsMoment(-Infinity) ;
        this.last_tick = JuttleMoment.epsMoment(-Infinity) ;
        this.last_emitted = JuttleMoment.epsMoment(-Infinity) ;
    }
    build_input(proc) {
        return new Input({proc: proc}) ;
    }
    //
    // upstream inputs feed us points, marks, ticks, and eofs by
    // calling the appropriate consume* methods on their data.  We
    // divert these through per-input process_from, mark_from,
    // tick_from, and eof_from, do a synchronizing merge across all
    // inputs, and ultimately call process, mark, eof on the merged
    // points as if there was a single upstream input feeding
    // them.
    //
    consume(points, from) {
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
        _.each(this.ins, function(input) {
            console.log(`${input.from.params.pname} qlen: ${input.length()} ${input.first(1) ? input.first(1).time.valueOf() : '-'} ${input.last(1) ? input.last(1).time.valueOf() : '-'}`);
        });
    }
    consume_mark(time, from) {
        if (this.ins.length === 1) {
            this.mark(time) ;
        } else {
            this.mark_from(time, from);
        }
    }
    consume_tick(time, from) {
        if (this.ins.length === 1) {
            this.tick(time) ;
        } else {
            this.tick_from(time, from);
        }
    }
    consume_eof(from) {
        if (this.ins.length === 1) {
            this.eof() ;
        } else {
            this.eof_from(from);
        }
    }
    process_from(points, from) {
        if (points.length === 0) {
            return ;
        }
        var self = this;
        _.each(points, function(pt) {
            self.advance_input({time:pt.time, point:pt}, self.in_from(from));});
    }
    mark_from(time, from) {
        this.advance_input({time:time, mark:true}, this.in_from(from));
    }
    tick_from(time, from) {
        this.advance_input({time:time, tick:true}, this.in_from(from));
    }
    eof_from(from) {
        this.advance_input({time: new JuttleMoment(Infinity), eof:true}, this.in_from(from));
    }
    advance_input(tpoint, input) {
        input.push(tpoint);
        this.produce();
    }
    // return the input having the earliest itemstamped item, or
    earliest() {
        // if all inputs are empty, return
        var pending = _.filter(this.ins, (input) => { return !input.empty(); });

        if (_.isEmpty(pending)) { return; }

        // timeless points are considered earliest of all
        var timeless = _.filter(pending, (input) => { return !input.first().time; });

        if (!_.isEmpty(timeless)) { return _.first(timeless); };

        // Find an input with earliest point. In case of ties, prefer marks so
        // they always go out ahead of points in their batch.
        return _.reduce(pending, (earliest, input) => {
            var inPt = input.first();
            var earliestPt = earliest.first();

            if (inPt.time.lt(earliestPt.time) || (inPt.mark && inPt.time.eq(earliestPt.time))) {
                return input;
            } else {
                return earliest;
            }
        }, pending.shift());
    }
    produce() {
        function produceMore(earliest, last_emitted, inputs) {
            return (
                // All inputs have something to say
                inputs.every((input) => { return !input.empty(); })

                // Or some are empty and the earliest is

                // A timeless point
                || !earliest.first().time

                // A timestamp equal to most recently emitted point, i.e. a duplicate
                || earliest.first().time.eq(last_emitted));
        }

        var earliest = this.earliest();
        while (earliest) {
            if (!produceMore(earliest, this.last_emitted, this.ins)) { break; }

            var output = earliest.shift();

            // EOFs have timestamp +Infinity. If the earliest point is an EOF,
            // all inputs were nonempty (produceMore returned true), so they're all EOFs.
            // Shifting the eof and getting out of the loop will ensure EOF is emitted only once.
            if (output.eof) {
                this.eof();
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
}



module.exports = fanin;

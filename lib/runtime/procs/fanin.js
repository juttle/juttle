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
        this.has_first_mark = false;
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
    }
    consume_mark(mark, from) {
        if (this.ins.length === 1) {
            if (this.has_first_mark) {
                this.mark(mark);
            } else {
                this.mark(_.omit(mark, 'interval'));
                this.has_first_mark = true;
            }
        } else {
            this.mark_from(mark, from);
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
    mark_from(mark, from) {
        this.advance_input(_.extend({ mark: true }, mark), this.in_from(from));
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

    // Return the input having the earliest itemstamped item or an input
    // containing a point with no timestamp. In case of ties, prefer marks so
    // they always go out ahead of points in their batch. If all inputs are empty,
    // return null.
    earliest() {
        var pendingInputs = _.filter(this.ins, (input) => { return !input.empty(); });

        if (_.isEmpty(pendingInputs)) { return null; }

        var timelessInput = _.find(pendingInputs, (input) => { return !input.first().time; });

        if (timelessInput) { return timelessInput; }

        function markWithInterval(a) {
            return a.mark && a.interval;
        }

        return _.reduce(pendingInputs, (earliest, input) => {
            var inPt = input.first();
            var earliestPt = earliest.first();

            if (inPt.time.lt(earliestPt.time) || (inPt.mark && inPt.time.eq(earliestPt.time))) {
                // Ensure that from two aligned batched streams, the 'shorter'
                // batch will always be picked as the earliest. This avoids
                // losing calendarness of mark intervals when a longer interval would
                // have to be subtracted from the shorter one.
                if (markWithInterval(inPt) && markWithInterval(earliestPt)) {
                    if (inPt.interval.lt(earliestPt.interval)) {
                        return input;
                    } else {
                        return earliest;
                    }
                }
                return input;
            } else {
                return earliest;
            }
        }, pendingInputs.shift());
    }
    produce() {
        var earliest = this.earliest();
        while (earliest) {
            var produceMore =
                // All inputs have something to say
                this.ins.every((input) => { return !input.empty(); })
                // Or some are empty and the earliest is a timeless point
                || !earliest.first().time
                // or has a timestamp equal to most recently emitted point/mark/tick
                || earliest.first().time.eq(this.last_emitted);

            if (!produceMore) { break; }

            var output = earliest.shift();

            if (output.mark && output.time.gt(this.last_mark)) {
                // First mark goes out without interval
                if (!this.has_first_mark) {
                    this.mark(_.omit(output, 'mark', 'interval'));
                    this.has_first_mark = true;
                } else {
                    // For non-overlapping/calendar intervals, fragment.
                    if (!output.interval || !this.last_mark.add(output.interval).eq(output.time)) {
                        output.interval = output.time.subtract(this.last_mark);
                    }
                    this.mark(_.omit(output, 'mark'));
                }

                this.last_mark = output.time;
                this.last_emitted = output.time;
            } else if (output.tick && output.time.gt(this.last_tick)) {
                this.tick(output.time);
                this.last_tick = output.time;
                this.last_emitted = output.time ;
            } else if (output.point) {
                this.process([output.point]);
                this.last_emitted = output.time || this.last_emitted; // timeless!
            } else if (output.eof) {
                // If we got here, all inputs were nonempty (produceMore was true).
                // As EOFs are added to the queue with a timestamp +Infinity and
                // the earliest point is an EOF, this implies all inputs are EOFs.
                // Shifting an EOF from of one of the inputs and getting out of the
                // loop will ensure EOF is emitted only once.
                this.eof();
                break;
            }

            earliest = this.earliest();
        }
    }
}



module.exports = fanin;

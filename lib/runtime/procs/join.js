'use strict';

// join assembles streams of points on its inputs into groups,
// then performs a relational join between these groups to produce
// new output points.
//
// Input Groups:
// An input group is a set of points arriving on an input and having
// the same timestamp (if not batched) or all points between two marks
// (if batched). Batched input groups are treated as if all their
// points arrived with the batch-end timestamp. Because of this
// grouping of like timestamps and strictly increasing batch marks,
// successive input group timestamps are strictly increasing.
//
// a join operation combines input groups to produce an output
// group. input groups may be re-used under certain conditions (eg, a
// fast input joining a slow input)
//
// batching admits the possibility of empty input groups -- no points
// between two marks -- which will produce empty outputs with no
// points between two marks.
//
// rules of join:
// 0. order independence: the output is independent of the total order
//    in which points arrive, so long as each input's points arrive in order
// 1. monotonicity rule: input groups are processed in strictly increasing order.
// 2. casualty rule: output timestamp >= input timestamps.
//
// corollaries:
// 3. output monotonicity: output group timestamps are strictly increasing (by 1 && 2)
// 4. each output group has a distinct timestamp (by 3)
// 5. an output group is formed from input groups having input <= output. (by 2)
//
// 6. no new timestamps rule: the join output timestamp is the maximum of the
//    join input group timestamps.
//    input groups having this maximum timestamp are the join _leaders_.
//    There may be more than one leader for a given join (equal timestamps).
//    remaining groups are the join _followers_.
//
// corollaries of 1 && 6:
// 7. an input group may only join once as a leader.
// 8. an input group may join many times as a follower.
//
// 9. newest match rule:
//    when choosing which group on an input to be a follower to a
//    given leader, prefer the one with the greatest timestamp (that
//    is still a follower).
//
// corollaries of 7 && 9:
// 10. equal timestamps are always joined if any is a leader. (9 forces a wait for equal leaders)
// 11. any but the newest group qualifying as a follower on an input has nothing to join with.
// 12. any follower or leader <= most recent output group timestamp has been joined at least once.
//
// sequential join processing:
//
// definitions:
//    A group is _live_ if it is the earliest non-expired group on its input
//
//    A group's _nextup_ is the immediately following group on the
//    same input if there is one. If the group is batched, its
//    _nextup_ is not considered to exist until either a data point or
//    a closing mark has arrived (we must differentiate between the
//    beginning of a new group or the lone batch end marker that
//    arrives just before EOF, which is not the beginning of a new
//    group).
//
//    A batched input group is _complete_ when a subsequent mark has
//    been queued.  An unbatched input group is _complete_ when a
//    subsequent greater timestamp is witnessed on the input (point,
//    mark, or tick). In particular, if a tick is received on an
//    unbatched input having no nextup, the group becomes complete
//    without a nextup, as ticks are never queued. Batched inputs are
//    unaffected by ticks.
//
//    An input group is _ready_ while all of these are true:
//    a) it is live
//    b) it is complete
//    c) it is a leader ( >= all live groups ) and > most recent output group timestamp
//       or it is the newest follower on the input (< some live group and its nextup > every live group)
//
//    An input group permanently expires once any of these is true:
//    a) its nextup exists and is <= some other live group
//    b) zip mode:   it is <= most recent output group timestamp.
//    c) maxoffset:  maxoffset is defined and group < some other live group - maxoffset
//
//    a expresses that better groups exist on the input for matching
//    with remaining inputs.  b enforces (via 12) that a group may
//    only join once, whether leader or follower.
//
// the streaming join will be driven by advancing inputs to successive output timestamps
// while maintaining an invariant as input queues change.
//
// streaming invariant:
//    each input's live group (if it has one) is the earliest group on the input.
//    Whenever a new point arrives, or a group expires, or a result is
//    output, evaulate each input's liveness and delete expired
//    groups. Repeat until the invariant is restored.
//
// join:
//    when the invariant holds and each input has a _ready_ group,
//    compute their join and emit output points with the leader
//    timestamp. set last_output to this value. if any leader input
//    was batched, output a closing mark (this is not considered an
//    output group timestamp). Restore the invariant.
//
// advance:
//    After a join, each input group may be _complete_ but no longer
//    _ready_ (because last_output has advanced). If all groups are
//    _complete_ and have a nextup, but one or more are not _ready_,
//    advance by deleting the group having the minimum nextup and
//    restoring the invariant. Else do nothing.
//
// terminate:
//    EOF is treated like a special mark/point and queued with an
//    infinite timestamp.  When EOF is the live group of any input, we
//    are done and may drop any unjoined groups.
//
// ticks:
//
// ticks indicate the passage of time and may thus advance a realtime
// join more quickly than a purely data driven advance. The computed
// results will be the same with or without ticks.
//
// ticks are never queued, and cannot be safely forwarded because join
// is a delaying proc and any received ticks are generally more recent
// than the ready set that is waiting to join. join will have to
// create its own tick stream when stalled (PROD-4876)
//
var DEQueue = require('double-ended-queue');
var _ = require('underscore');
var JuttleMoment = require('../../runtime/types/juttle-moment');

var base = require('./base');
var Groups = require('../groups');

// timeless points get this timestamp
var timeless_time = new JuttleMoment(-Infinity);

class Input {
    constructor(options, params, location, program) {
        this.from = options.proc;     // input node
        this.i = options.i;           // index in inputs[]
        this.batched = false; // is this input in batching mode?
        this.table = false;   // treat this like a timeless table?
        this.queue = new DEQueue();
    }
    live() {
        // input's live group is the beginning of the queue (assumes
        // expired groups have been deleted)
        return this.first();
    }
    nextup() {
        // input's nextup group is the one following live.
        return (this.length() > 1) ? this.first(1) : null;
    }
    live_time() {
        return this.empty() ? null : this.first()[0].time;
    }
    complete_time() {
        return this.empty() ? null : this.first().complete_time;
    }
    next_time() {
        // note: next_time is not immediately nextup()[0].time, but
        // eventually becomes that as input arrives.
        return this.empty() ? null : this.first().next_time;
    }
    at_eof() {
        return this.empty() ? false : this.first()[0].eof;
    }
    toString() {
        return 'input['+this.i+']'+(this.batched?'.batched':'')+' q:'+JSON.stringify(this.q);
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
}

// when we are passed lists of points to join (the join inner loop),
// use our group-by technology to group the points of each input by
// their joinkey values. At the end of that we'll have grouped together
// the points that should be joined, and won't have to consider joining
// ones that aren't grouped together, and will escape our O(n^2) hell.
class JoinkeyGroups extends Groups {
    get_row(keyID) {
        var row = this.table[keyID];
        if (!row) {
            row = this.table[keyID] = [];
        }
        return row;
    }
}

var INFO = {
    type: 'proc',
    options: {   // documented, non-deprecated options only
        nearest: {},
        once: {},
        outer: {},
        zip: {}
    }
};

// The place to start reading this beast is advance_input(),
// which is called whenever a point, mark, tick, or EOF is
// sent by an input. Everything else fans out from that.
//
class join extends base {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        var allowed_options = ['zip', 'nearest', 'once', 'outer', 'table', 'columns'];
        this.validate_options(allowed_options);
        this.joinfields = options.columns || [];
        delete options.columns;
        // one big join, no streaming.
        this.once = Boolean(options.once);
        if (options.zip !== undefined && options.nearest !== undefined) {
            throw this.compile_error('JOIN-ZIP-NEAREST-ERROR');
        }
        // each point joins at most one time
        this.zip = Boolean(options.zip);
        if (options.zip !== undefined) {
            if (options.zip.duration) {
                this.maxoffset = options.zip;
            } else if (options.zip !== true) {
                throw this.compile_error('JOIN-ZIP-ERROR');
            }
        } else if (options.nearest !== undefined) {
            this.maxoffset = options.nearest;
        }
        if (this.joinfields.indexOf('time') >= 0 && !this.once) {
            this.maxoffset = this.maxoffset || JuttleMoment.duration(0);
            this.joinfields = _.without(this.joinfields, 'time');
        }
        if (this.maxoffset && !this.maxoffset.duration) {
            throw this.compile_error('INVALID-OFFSET');
        }
        if (options.table !== undefined) {
            this.table = Array.isArray(options.table) ? options.table : [options.table];
        }
        if (options.outer !== undefined) { // outer join, preserving this input
            this.outer = options.outer;
            if (!_.isNumber(this.outer)) {
                throw this.compile_error('JOIN-INPUTNUM-ERROR', {
                    option: 'outer'
                });
            }
        } else {
            this.outer = null;
        }
        var impossibly_early = JuttleMoment.epsMoment(-Infinity) ;
        // most recent point/tick/mark emitted
        this.last_emitted = impossibly_early;
        // most recent result: point or eps batch-end
        this.last_output = impossibly_early;
        // most recent mark emitted
        this.last_mark = impossibly_early;
        this.eof_emitted = false;
        this.settings_checked = false;
        this.joinkey_groups = new JoinkeyGroups(this, {groupby: this.joinfields});
        this.joinkey_groups._undefined_fields_warned = _.invert(this.joinfields);
    }
    procName() {
        return 'join';
    }
    toString() {
        var s = 'join last_output '+this.last_output;
        this.ins.forEach(function(input) {
            var complete_time = input.complete_time();
            var start_time = input.live() && input.live().start_time;
            var next_time = input.next_time();
            s = (s + '\n  '+ input +
                 '\n    start_time '+start_time+' complete_time '+complete_time + ' next_time '+next_time+
                 ' ready:' + this.is_ready(input) + ' expired:'+this.is_expired(input) +
                 ' leader:' + this.is_leader(input) + ' follower:' + this.is_follower(input)
                );
        }, this);
        return s;
    }
    build_input(proc) {
        return new Input({
            proc: proc,
            i: this.ins.length
        });
    }
    check_settings() {
        // on our first input, verify settings
        if (this.settings_checked) {
            return ;
        }
        this.settings_checked = true;
        if (_.isNumber(this.outer) && (this.outer < 1 || this.outer > this.ins.length)) {
            throw this.runtime_error('JOIN-INPUTNUM-ERROR', {
                option: 'outer'
            });
        }
        if (this.table) {
            if (this.table.length === this.ins.length) {
                throw this.runtime_error('JOIN-ALL-TABLES-ERROR');
            }
            for (var i = 0; i < this.table.length; i++) {
                var idx = this.table[i];
                if (!_.isNumber(idx) || idx < 1 || idx > this.ins.length) {
                    throw this.runtime_error('JOIN-INPUTNUM-ERROR', {
                        option: 'table'
                    });
                } else if (idx === this.outer) {
                    throw this.runtime_error('JOIN-TABLE-OUTER-ERROR');
                }
                this.ins[idx - 1].table = true;
            }
        }
    }
    consume(points, from) {
        this.stats.points_in += points.length;
        try {
            this.process_from(points, from);
        } catch (err) {
            this.trigger('error', err);
        }
    }
    consume_mark(mark, from) {
        this.mark_from(mark, from);
    }
    consume_tick(time, from) {
        this.tick_from(time, from);
    }
    consume_eof(from) {
        this.eof_from(from);
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
        this.advance_input({time:mark.time, mark:true}, this.in_from(from));
    }
    tick_from(time, from) {
        this.advance_input({time:time, tick:true}, this.in_from(from));
    }
    eof_from(from) {
        // wrap the eof in a tpoint and process it.
        this.advance_input({time: new JuttleMoment(Infinity), eof:true}, this.in_from(from));
    }
    is_expired(input) {
        // expired means nothing more for this input group to do.
        // see sequential join definitions

        if (input.table) {
            // tables only expire when an update begins to arrive
            // having a timestamp earlier than other non-table inputs
            // (and hence we know the update is a better timestamp
            // match than the current one). The idea is that we'll
            // believe your timestamps when they make sense, and try
            // to match up a stream of tables to non-tables using
            // timestamps in the usual way, preserving causality, BUT
            // we won't force join to wait around for a provably
            // better (or worse) timestamp match to come along when we
            // have a complete table to join with and nothing better
            // has arrived.
            return input.nextup() && !input.nextup()[0].eof && this.max_live_time().gte(input.nextup().table_time);
        }

        var live_time = input.live_time();
        var next_time = input.next_time();

        if (!input.complete_time()) {
            return false ; // too soon to tell
        }
        if (this.maxoffset && this.maxoffset.finite()) {
            var max_live_time = this.max_live_time() ;
            var too_old = max_live_time.subtract(this.maxoffset);
            if (live_time.lt(too_old)) {
                return true;
            }
        }
        if (this.zip && live_time.lte(this.last_output)) {
            // this.last_output tells if we've ever joined (by 12.),
            // and zip mode only joins a group once.
            return true;
        }
        if (!next_time) {
            return false; // too soon to tell
        }
        var next_is_earlier = this.ins.some(function(other) {
            var ot = other.live_time();
            return ot && next_time.lte(ot);
        });
        if (next_is_earlier) {
            return true;
        }
        return false;
    }
    is_leader(input) {
        // most recent live group over all inputs
        // see sequential join definitions
        var t = input.live_time();
        return (t && this.ins.every(function(other) {
            var ot = other.live_time();
            return !ot || t.gte(ot);
        }));
    }
    is_follower(input) {
        // live but not a leader
        // see sequential join definitions
        var t = input.live_time();
        return (!t || this.ins.some(function(other) {
            var ot = other.live_time();
            return ot && ot.gt(t);
        }));
    }
    is_ready(input) {
        // input group can be joined.
        // see sequential join definitions
        var complete_time = input.complete_time();
        var next_time = input.next_time();

        if (input.table) {
            return Boolean(complete_time);
        }

        if (!complete_time) {
            return false ;
        } else if (this.is_leader(input)) {
            return input.live_time().gt(this.last_output);
        } else if (this.is_follower(input) && next_time) {
            if (input.i === this.outer - 1 && input.live_time().lte(this.last_output)) {
                // outer suppresses repeated joins with the named input. It only joins
                // when the named input is the leader, or when the named input is a follower
                // in the very first join (before this.last_output has a non-sentinel value)
                return false ;
            }
            return (this.ins.every(function(other) {
                var ot = other.live_time();
                return !ot || next_time.gt(ot); // live is the newest follower
            }));
        } else {
            return false;
        }
    }
    max_live_time() {
        // leader timestamp. this will become the output timestamp of a join result
        var t = JuttleMoment.max.apply(
            null, _.select(_.map(this.ins, function(input) { return input.live_time(); })));
        return t;
    }
    batched_leader() {
        // if there is a batched input having a group that is a leader, return it
        // so we know to emit a mark after the join result.
        if (this.outer) {
            return this.ins[this.outer - 1].batched ? this.ins[this.outer - 1] : null ;
        } else {
            var leaders = _.select(this.ins, function(input) {
                return this.is_leader(input) && input.batched;
            }, this);
            return leaders[0];
        }
    }

    witness_timestamp(tpoint, input) {
        // Nothing to do for empty inputs
        if (input.empty()) { return; }

        // a new timestamped thing has arrived at the input. adjust
        // input states related to maximum-seen timestamps of various types.
        var last = input.last();
        var last_time = last[0].time;

        if (input.batched) {
            if (tpoint.mark) {
                // mark the last group/batch as being complete and
                // snap all its timestamps to batch end.  we can't
                // know if this mark time should also be
                // last.next_time until the next point, when we learn
                // if EOF follows this mark (no) or another point or
                // mark follows (yes).
                last.complete_time = tpoint.time ;
                last.batch_end = JuttleMoment.epsMoment(tpoint.time);
                last.map(function(tp) { tp.time = last.batch_end; });
            }
            // reach back to earlier batch and finalize its next_time.
            // this is the rolled-forward batch_end value, not the original start.
            var lastlast = input.last(1);
            if (lastlast) {
                if (tpoint.eof) {
                    lastlast.next_time = tpoint.time; // skip over final mark to eof (Infinity)
                } else {
                    lastlast.next_time = last.batch_end;
                }
            }
        } else {
            if (this.once) {
                // only eof completes when in -once mode
                if (tpoint.eof) {
                    last.complete_time = last.next_time = tpoint.time;
                }
            } else {
                if (input.table) {
                    if (tpoint.table_time.gt(last.table_time)) {
                        // a newer timestamp completes a timeless table and leaves it in place
                        last.complete_time = tpoint.table_time;
                    }
                } else {
                    if (tpoint.time && tpoint.time.gt(last_time)) {
                        // a newer tick or point or eof completes a timestamp group
                        last.complete_time = tpoint.time;
                        if (!tpoint.tick) {
                            last.next_time = tpoint.time; // ticks are not queued so are never next
                        }
                    }
                }
            }
        }
    }

    queue_tpoint(tpoint, input) {
        // decide whether to add this point to an existing group,
        // or start a new input group, then queue it.
        if (tpoint.tick) {
            return;
        }

        if (tpoint.eof) {
            if (input.batched) {
                // the final batch-end mark is a complete pain in the
                // ass, since it does not begin an actual batch. we
                // have already stashed its timestamp in the prior
                // complete_time so clobber it.
                input.pop() ;
            }
            input.push([]); // eof starts a new group
        } else if (this.once) {
            // all non-eof items go into one big group
            if (input.empty()) {
                input.push([]) ;
            }
        } else if (tpoint.mark) {
            input.push([]); // mark starts a new group
            input.last().start_time = tpoint.time;
        } else if (tpoint.point && !input.batched &&
                   (input.empty()
                    || tpoint.time.gt(input.last()[0].time)
                    || input.last().complete_time)) {
            // new unbatched group. fake a mark at the front for consistency.
            input.push([{time:tpoint.time, mark:true}]);
        }

        // add tpoint to newest group
        input.last().push(tpoint);

        if (input.table) {
            // Update groups table_time using arriving point's time.
            var last = input.last();
            last.table_time = tpoint.table_time;

            if (input.at_eof()) {
                // mark it complete for when stream is empty, so an
                // outer join can proceed against it.
                last.complete_time = tpoint.table_time;
            }
        }
    }

    advance_input(tpoint, input) {
        // a new point arrived at the input. chew it, view it, and
        // queue it, then kick off any joins made possible by its
        // arrival.
        // tpoint is: {time:timeval, point:pointobj, mark:bool, tick:bool, eof:bool}

        this.check_settings();

        // All inputs are at EOF, nothing to do
        if (this.eof_emitted) {
            return;
        }

        // First arriving mark sets the input as batched. Also, batches and tables
        // don't go well together.
        if (tpoint.mark && input.table) {
            throw this.runtime_error('JOIN-TABLE-BATCHED-ERROR');
        } else if (tpoint.mark && !this.once && !input.batched) {
            input.batched = true ;
        }

        // Timeless points go earliest in the queue
        if (!tpoint.time) {
            tpoint.time = timeless_time;
        }

        // Points from this input should be treated as a timeless
        // table. Store the time into table_time, then rewrite the point
        // to be timeless.
        if (input.table) {
            tpoint.table_time = tpoint.time;
            tpoint.time = timeless_time;
        }

        // Update metadata of the latest point in this input
        this.witness_timestamp(tpoint, input);

        // Enqueue point, creating new join groups as necessary
        this.queue_tpoint(tpoint, input);

        while (this.advance()) {
            var joinpts = this.join_inputs();
            this.emit_result(joinpts);
        }

        // Check for eof
        if (!this.eof_emitted &&
            this.ins.every(function at_eof(input) {
                return input.at_eof() || input.table;
            })) {

            // when all inputs hit eof we are done.
            this.eof();
            this.eof_emitted = true;
        }
    }
    discard_group(input) {
        // throw away the earliest group on the input.
        if (this.outer === input.i + 1 && input.live_time().gt(this.last_output)) {
            // we are doing an outer join, and an outer input group is
            // about to be discarded without having been joined.  emit
            // the unadorned outer points. NB: it is not safe to join
            // these against other inputs as one might hope, because
            // inputs are not in a synchronized state while advance()
            // is being called. bummer.
            var outer_points = _.pluck(input.live(), 'point').filter(Boolean);
            this.emit_result(outer_points) ;
        }
        input.shift();
    }

    advance() {
        // state has changed, either from new input points arriving or
        // new output points being emitted. restore the streaming
        // invariant by removing newly expired groups. advance join
        // state by removing one or more stalled (complete but not
        // ready) groups. return true if all groups are ready to join
        // after all that advancing.
        var done = false ;

        while (!done) {
            done = true ;

            // drop expired groups.
            this.ins.forEach(function delete_expired(input) {
                while (this.is_expired(input)) {
                    this.discard_group(input);
                    done = false;
                }
            }, this);

            // if join is stalled, find the nearest next group and make it live.
            if (_.every(this.ins, function has_next(input) { return (input.table && input.complete_time()) || input.next_time(); }) &&
                !_.every(this.ins, this.is_ready, this)) {
                if (this.outer) {
                    this.discard_group(this.ins[this.outer - 1]);
                } else {
                    // discard the non-table having the earliest next_time
                    var earliest_next = this.ins[0];
                    this.ins.forEach(function(input) {
                        if (earliest_next.table ||
                            input.next_time() && input.next_time().lt(earliest_next.next_time())) {
                            earliest_next = input;
                        }
                    });
                    this.discard_group(earliest_next);
                }
                done = false;
            }
        }

        return _.every(this.ins, this.is_ready, this);
    }
    join_inputs() {
        // assemble working sets from ready input groups, compute
        // their relational join, and assign an approprite timestamp
        // to the results.
        var ingroups = this.ins.map(
            // grab the points and discard the marks
            function group(input) { return _.pluck(input.live(), 'point').filter(Boolean); }
        );
        var joinpts = (ingroups.length === 1)
            ? this.join_points(ingroups[0], this.joinfields)
            : this.join_groups(ingroups, this.joinfields);
        var join_time = this.outer ? this.ins[this.outer - 1].live_time() : this.max_live_time();
        if (join_time.finite()) {
            joinpts.map(function(p) {
                p.time = join_time;
            });
        }
        return joinpts;
    }
    join_points(points, joinfields) {
        // join allll the points. return array of new points resulting
        // from what is essentially a relational join of every point
        // against every other (a union of points having same
        // joinfields values). We do this for single-stream join
        // behavior. returns one result point for each distict value
        // of the joinfields.
        var result = [];
        var groups = _.groupBy(points, function(pt) {
            var keys = [];
            joinfields.forEach(function(key) {
                keys.push(JSON.stringify(pt[key]));
            });
            return keys;
        });
        for (var group in groups) {
            result.push(_.extend.apply({}, groups[group])); // union all fields for this group
        }
        return result;
    }
    join_groups(groups) {
        // return array of new points resulting from an n-way
        // relational join of the points on each input. groups is an
        // array of point lists, one list per input.
        var outer = this.outer ? this.outer - 1 : null;
        if (outer !== null && outer > 0) {
            // we need the outer group at the front of the array
            var g0 = groups[0];
            groups[0] = groups[outer];
            groups[outer] = g0;
        }
        var joinkey_groups = this.joinkey_groups;
        joinkey_groups.reset();

        groups.forEach(function(pts, idx) {
            // stash the points into groups by joinkey
            pts.forEach(function(pt) {
                var row = joinkey_groups.lookup(pt);
                row[idx] = row[idx] || [];
                row[idx].push(pt);
            });
        });
        var joinpts = [];
        joinkey_groups.apply(function(keyID) {
            // find group rows that have points for every input (inner
            // join) or at least the outer join input, and join them.
            // (remember, we moved the outer group to position 0 in
            // row)
            var row = joinkey_groups.table[keyID];
            var ninputs = (outer === null) ? row.reduce(function(total, item) { return total + 1; }, 0) : null;
            if ((outer !== null && row[0]) || ninputs === groups.length) {
                // pre-allocate results for this row in the output array;
                var n = row.reduce(function(prod, group) { return group.length * prod; }, 1);
                var joinpts_0 = joinpts.length;
                for (var i = 0; i < n; i++) {
                    joinpts.push({});
                }
                // form the cartesian product of input point groups for this row.
                for (var gi = 0; gi < row.length; gi++) {
                    var group = row[gi];
                    if (!group) {
                        continue ;
                    }
                    var stride = row.slice(gi+1).reduce(function(prod,group) { return prod * group.length; }, 1);
                    var idx = joinpts_0;
                    while (idx < joinpts.length) {
                        for (i = 0; i < group.length; i++) {
                            for (var j = 0; j < stride; j++) {
                                _.defaults(joinpts[idx++], group[i]);
                            }
                        }
                    }
                }
            }
        });
        return joinpts;
    }
    emit_result(points) {
        // emit the points, possibly bracketed by marks, and update emitter state.
        var leader = this.batched_leader() ;
        var join_time = this.outer ? this.ins[this.outer - 1].live_time() : this.max_live_time();
        if (leader) {
            this.maybe_emit_mark(leader.live().start_time);
        }
        if (points.length) {
            this.process(points);
            this.last_emitted = join_time;
        }
        this.last_output = join_time ; // output advances even for empty result
        if (leader) {
            this.maybe_emit_mark(leader.live().complete_time);
        }
    }
    maybe_emit_mark(time) {
        // emit a mark at this time if one has not already been emitted
        if (time.gt(this.last_mark)) {
            if (time.lt(this.last_emitted)) {
                throw new Error('join tried to emit mark out of order'); // "impossible"
            }
            this.emit_mark({ time: time });
            this.last_emitted = time;
            this.last_mark = time;
        }
    }

    static get info() {
        return INFO;
    }
}

module.exports = join;

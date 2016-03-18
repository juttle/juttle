'use strict';

var _ = require('underscore');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var fanin = require('./fanin');
var values = require('../values');


var INFO = {
    type: 'proc',
    options: {   // documented, non-deprecated options only
        every: {},
        from: {},
        x: {}
    }
};

class pace extends fanin {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        var allowed_options = ['x', 'every', 'from'];
        this.validate_options(allowed_options);

        this.from = options.from ;
        if (this.from !== undefined && !this.from.moment) {
            throw this.compile_error('MOMENT-ERROR', {
                option: 'from',
                value: values.inspect(this.from)
            });
        }
        if (options.every && options.x) {
            throw this.compile_error('PACE-EVERY-X-ERROR');
        }
        this.every = options.every;
        if (this.every !== undefined && !this.every.duration) {
            throw this.compile_error('DURATION-ERROR', {
                option: 'every',
                value: values.inspect(options.every)
            });
        }
        this.x = options.x || 1;
        if (!_.isFinite(this.x)) {
            throw this.compile_error('NUMBER-ERROR', {
                option: 'x',
                value: values.inspect(options.x)
            });
        }
        this.timer = null;
        this.wakeup_timer = null;
        // true if we have received a mark
        this.batched = false;
        // from - first timestamp received
        this.offset = null;
        // true if we have received eof
        this.has_eof = false;
        // true when we have received a timestamp >= :now:
        this.has_realtime = false;
        // epochms wallclock when most recent item was queued
        this.last_q_ms = null;
        this.q = [];
        this.playback = this.playback.bind(this);
        this.wakeup = this.wakeup.bind(this);
    }
    procName() {
        return 'pace';
    }
    teardown() {
        clearTimeout(this.timer);
        clearTimeout(this.wakeup_timer);
    }
    offset_time(time) {
        if (this.from && !this.offset && time) {
            // offset is based on the first timestamp we see.
            this.offset = this.from.subtract(time) ;
        }
        return (this.offset && time) ? time.add(this.offset) : time;
    }
    dont_pace() {
        // no historic points are queued, and no more are coming.
        return ((this.has_realtime || this.has_eof) && this.q.length === 0);
    }
    process(points) {
        var i;
        if (points.length === 0) {
            return ;
        }
        if (this.from) {
            for (i = 0 ; i < points.length ; i++) {
                points[i] = _.clone(points[i]);
                points[i].time = this.offset_time(points[i].time);
            }
        }
        if (this.dont_pace()) {
            this.emit(points);
            return;
        }
        var latest = _.last(this.q);
        for (i = 0 ; i < points.length ; i++) {
            var p = {time:points[i].time, point:points[i]};
            if (latest && (latest[0].mark || p.time.eq(latest[0].time))) {
                latest.push(p); // accumulate with like-timestamped points
            } else {
                this.q.push([p]); // a new timestamp
            }
        }
        if (_.last(points).time.gte(this.program.now)) {
            this.has_realtime = true;
            if (!this.timer) {
                this.playback();
            }
        } else {
            this.last_q_ms = Date.now();
            if (!this.wakeup_timer) {
                this.wakeup();
            }
        }
    }
    mark(mark_) {
        var mark = _.clone(mark_);

        mark.time = this.offset_time(mark.time);

        if (this.dont_pace()) {
            this.emit_mark(mark);
            return;
        }
        if (!this.batched) {
            this.batched = true;
            this.emit_mark(mark); // emit first mark immediately
        }
        this.q.push([_.extend(mark, { mark:true })]);
        if (mark.time.gte(this.program.now)) {
            this.has_realtime = true;
            if (!this.timer) {
                this.playback();
            }
        } else {
            this.last_q_ms = Date.now();
            if (!this.wakeup_timer) {
                this.wakeup();
            }
        }
    }
    tick(time) {
        if (this.dont_pace()) {
            this.emit_tick(time);
        }
    }
    eof() {
        if (this.dont_pace()) {
            this.emit_eof();
            return;
        }
        this.q.push({eof: true});
        this.has_eof = true;
        if (!this.timer) {
            this.playback();
        }
    }
    wakeup() {
        // historic+live streams sometimes don't have a point at :now:
        // and paced history won't start rendering until the first realtime
        // point has been encountered. To avoid this delay,
        // if input ever stalls for a wallclock second, start playback
        if (this.dont_pace()) {
            return;
        }
        if (!this.timer && this.q.length && this.last_q_ms < Date.now() - 1000) {
            this.playback();
        }
        this.wakeup_timer = setTimeout(this.wakeup, 1000);
    }
    playback() {
        this.timer = null;
        if (!this.last_t) {
            this.last_t = new JuttleMoment(Date.now()/1000);
        }
        if (this.q.length === 0) {
            return;
        } else if (!this.q[0].eof) {
            var q0 = this.q[0][0];
            if (this.q.length > 1 && !this.q[1].eof ) {
                // schedule the next output
                var q1 = this.q[1][0];
                var delta = q1.time.subtract(q0.time);
                var interval = (this.every) ? this.every : delta.divide(this.x);
                this.last_t = this.last_t.add(interval);
                var timeout = this.last_t.unixms() - Date.now();
                this.timer = setTimeout(this.playback, timeout);
            }
            if (this.q[0][0].mark) {
                this.q[0].shift() ; // mark already emitted by previous batch
            }
            this.emit(_.pluck(this.q[0], 'point')) ;
            this.q.shift();
        }
        if (this.q.length && this.q[0].eof) {
            this.q.shift();
            this.emit_eof() ;
        } else if (this.q.length && this.q[0][0].mark) {
            this.emit_mark(_.omit(this.q[0][0], 'mark')) ; // mark end of batch (but don't shift yet)
        }
    }

    static get info() {
        return INFO;
    }
}

module.exports = pace;

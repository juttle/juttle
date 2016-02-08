'use strict';

var _ = require('underscore');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var fanin = require('./fanin');
var periodic_funcs = require('./periodic_funcs');
var values = require('../values');

var periodic_fanin = fanin.extend(periodic_funcs);

//
// batch input by time by inserting marks into the stream as each
// epoch passes.  interval option is in seconds or a duration (regular
// or calendar).  on is an optional duration or moment that specifies
// an alignment of the epoch sequence: the on moment, or the on
// duration after the unix epoch, will be a batch epoch and all other
// epochs are aligned relative to this.
//

var INFO = {
    type: 'proc',
    options: {   // documented, non-deprecated options only
        every: {},
        on: {}
    }
};

var batch = periodic_fanin.extend({
    initialize: function(options) {
        var allowed_options = ['arg', 'every', 'on'];
        this.validate_options(allowed_options);

        this.interval =  options.arg;
        if (options.every) {
            if (!options.every.duration) {
                throw this.compile_error('RT-DURATION-ERROR', {
                    option:'every',
                    value:values.inspect(options.every)
                });
            }
            if (this.interval) {
                throw this.compile_error('RT-BATCH-INTERVAL-EVERY-ERROR');
            }
            this.interval = options.every;
        } else if (!this.interval) {
            throw this.compile_error('RT-BATCH-INTERVAL-EVERY-ERROR');
        } else if (!this.interval.duration
            && (_.isFinite(this.interval) && this.interval > 0)) {
            // convert bare numbers to durations (legacy)
            this.interval = JuttleMoment.duration(this.interval);
        } else if (!this.interval.duration) {
            throw this.compile_error('RT-BATCH-INTERVAL-ERROR');
        }
        if (this.interval.seconds() <= 0) {
            throw this.compile_error('RT-BATCH-INTERVAL-ERROR');
        }
        if (options.on) {
            if (options.on.duration) {
                if (options.on.gt(this.interval)) {
                    throw this.compile_error('RT-ON-EVERY-ERROR', {
                        proc: this.procName()
                    });
                }
                this.on = (new JuttleMoment(0)).add(options.on);
            } else if (options.on.moment) {
                this.on = options.on;
            } else {
                throw this.compile_error('RT-DURATION-OR-MOMENT-ERROR', {
                    option: 'on',
                    value: values.inspect(options.on)
                });
            }
        } else {
            this.on = null;
        }
        this.init_warnings();
    },
    procName: function() {
        return 'batch';
    },
    process_points: function(points) {
        this.emit(points);
    },
    advance_epoch: function(epoch) {
        this.emit_mark(epoch);
        // callers expect to receive an array of points to emit
        // which doesn't apply to batch
        return [];
    },
    tick: function(time, from) {
        if (time.gt(this.program.now)) {
            // advance on live ticks
            this.advance(time);
        }
        this.emit_tick(time);
    },
    periodic_eof: function(from) {
        if (this.next_epoch) {
            // output the final end of batch mark.
            this.advance(this.next_epoch);
        }
        this.emit_eof();
    }
}, {
    info: INFO
});

module.exports = batch;

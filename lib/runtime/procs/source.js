//
// base class for all sources
//

var juttle_utils = require('../juttle-utils');
var values = require('../values');
var _ = require('underscore');
var JuttleMoment = require('../../moment').JuttleMoment;

var base = require('./base');

var INFO = {
    type: 'source',
    options: {
        from: {},
        to: {},
        last: {},
        lag: {},
        queueSize: {},
        timeField: {}
    }
};

var source = base.extend({
    initialize: function(options, params) {
        this.queue = [];
        this.queueSize = options.queueSize || 100000;

        this.tickEvery = new JuttleMoment.duration(1, 's');
    },

    DEFAULT_TIME_RANGE: {
        EMPTY: 'EMPTY',
        INFINITE: 'INFINITE',
        NONE: 'NONE'
    },

    // Process the common time options (from / to / last) to ensure they are all
    // the correct types and to convert `last` into the corresponding from/to
    // combinations.
    //
    // The `defaultTimeRange` parameter must be one of:
    //    * EMPTY: from and to default to :now:, one must be specified
    //    * INFINITE: from defaults to :0: and to defaults to :end:
    //    * NONE: both from and to are undefined and not required.
    //
    // If the time selection is valid, it is stored in `this.from` and
    // `this.to`.
    handleTimeOptions: function(options, defaultTimeRange) {
        if (options.from) {
            if (! options.from.moment) {
                throw this.compile_error('RT-MOMENT-ERROR', {
                    option: 'from',
                    value: values.inspect(options.from)
                });
            }

            this.from = options.from;
        }

        if (options.to) {
            if (!options.to.moment) {
                throw this.compile_error('RT-MOMENT-ERROR', {
                    option: 'to',
                    value: values.inspect(options.to)
                });
            }

            this.to = options.to;

            if (this.from && this.from.gt(this.to)) {
                throw this.compile_error('RT-TO-BEFORE-FROM-MOMENT-ERROR');
            }
        }

        if (options.last) {
            if (!options.last.duration) {
                throw this.compile_error('RT-DURATION-ERROR', {
                    option: 'last',
                    value: values.inspect(options.last)
                });
            }

            if (this.from || this.to) {
                throw this.compile_error('RT-LAST-FROM-TO-ERROR');
            }

            this.to = this.program.now;
            this.from = this.to.subtract(options.last);
        }

        // XXX/demmer not sure if this belongs here.
        this.lag = options.lag || new JuttleMoment.duration(0, 's');
        this.readEvery = options.readEvery || new JuttleMoment.duration(1, 's');

        switch (defaultTimeRange) {
        case this.DEFAULT_TIME_RANGE.EMPTY: {
            if (!this.from && !this.to) {
                throw this.compile_error('RT-MISSING-TIME-RANGE-ERROR');
            }
            this.from = this.from || this.program.now;
            this.to = this.to || this.program.now;
            break;
        }
        case this.DEFAULT_TIME_RANGE.INFINITE: {
            this.from = this.from || new JuttleMoment(0);
            this.to = this.to || new JuttleMoment(Infinity);
            break;
        }
        case this.DEFAULT_TIME_RANGE.NONE:
            break;
        default:
            throw new Error('invalid defaultTimeRange ' + defaultTimeRange);
        }
    },

    start: function() {
        // Compute the first tick to emit but don't start scheduling ticks until
        // we transition to live mode.
        this.nextTick = JuttleMoment.max(this.program.now, this.from);

        // If from is in the past or to is finite, then the program starts off
        // in historical mode. Once the historical portion of the read is
        // complete, then it will either complete the full query (if `to` is
        // finite) or transition into live mode if `to` is `:end:`. In the
        // latter case, we stop the historical part of the query at now - lag
        // since we'll pick up from there after waiting the appropriate amount
        // of time.
        //
        // This all totally breaks down if there is any clock skew between the
        // juttle runtime and the data points in the back end.
        if (this.from.lt(this.program.now) || !this.to.isEnd()) {
            this.readFrom = this.from;
            if (this.to.isEnd()) {
                // XXX/demmer need to handle the case where now - lag > from
                this.readTo = this.program.now.subtract(this.lag);
            } else {
                this.readTo = this.to;
            }
            this.logger.debug('starting historical read', this.readFrom.toJSON(), this.readTo.toJSON());
            this.run();
        } else {
            // For pure live, the first chunk of points goes from now until
            // readEvery in the future.
            //
            // So before the initial set of points are read, wait for both the
            // readEvery period as well as the lag time to pass.
            this.readFrom = this.program.now;
            this.readTo = this.program.now.add(this.readEvery);
            var firstRead = this.program.now.add(this.readEvery).add(this.lag);
            this.logger.debug('scheduling first live read at', firstRead.toJSON());
            this.program.scheduler.schedule(firstRead.unixms(), _.bind(this.run, this));
        }
    },

    // This is the main execution function for reading from sources.
    // XXX comment
    run: function() {
        if (this.reading) {
            throw new Error('run should not be called while reading');
        }

        this.reading = true;
        this.logger.debug('read from', this.readFrom.toJSON(),
                          'to', this.readTo.toJSON(),
                          'limit', this.queueSize, 'state', this.readState);

        this.read(this.readFrom, this.readTo, this.queueSize, this.readState)
        .then((result) => {
            this.reading = false;

            // XXX once we actually implement a flow control scheduler, this
            // should push the points onto a queue and then rely on interactions
            // with the scheduler to drain the queue before rescheduling.
            if (result.points && result.points.length !== 0) {
                this.logger.debug('emitting', result.points.length, 'points');
                this.emit(result.points)
                this.lastEmit = result.points[result.points.length - 1].time;
            } else {
                this.logger.debug('read returned no points');
            }

            // Check if we need to send a tick to cover a gap in the points.
            if (result.done) {
                while (this.nextTick.lt(this.readTo)) {
                    if (!this.lastEmit || this.nextTick.gt(this.lastEmit)) {
                        this.emit_tick(this.nextTick);
                    }
                    this.nextTick = this.nextTick.add(this.tickEvery);
                }
            }

            this.readState = result.state;
            this.readDone = result.done;
            this.reschedule();
        });
    },

    // Based on whether or not the current read is completed, update the time
    // bounds and schedule another read.
    //
    // XXX this will need to be reworked to interact with the flow control
    // scheduler.
    reschedule: function() {
        if (this.readDone) {
            // If to is not :end: then this is a purely historical read, so once
            // it is done with the initial batch, we can simply emit eof and
            // be done.
            if (! this.to.isEnd()) {
                this.logger.debug('read done for historical source. emitting eof.')
                this.emit_eof();
                return;
            }

            // Otherwise, advance the readFrom and readTo bounds and schedule a
            // callback for the next time we should read.
            this.readFrom = this.readTo;
            this.readTo = this.readFrom.add(this.readEvery);
            this.program.scheduler.schedule(this.readTo.add(this.lag).unixms(), _.bind(this.run, this));
        } else {
            // There's more to read in the current time period, so ask the
            // scheduler to call us back and read more.
            this.program.scheduler.schedule(this.scheduler.now(), _.bind(this.run, this));
        }
    },

    // Abstract function that is expected to be implemented by a subclass to
    // read up to `limit` points between the specified time intervals.
    //
    // Returns a promise that resolves with an object containing:
    //   points: the points that are ready to emit in the flowgraph
    //   done: true if all points between [from..to) were produced
    //   state: optional continuation state for paging
    //
    // The state returned from one call to read will be passed into a
    // subsequent call when fetching the points.
    read: function(from, to, limit, state) {
        throw new Error('read not implemented');
    },

    // Assigns the time from timeField to 'time' and attempts to convert it
    // into JuttleMoment
    //
    // If not specified, timeField defaults to 'time'. If specified and point
    // is missing that field, emits a warning.
    parseTime: function(points, timeField) {
        var self = this;

        _.each(points, function(pt) {
            if (timeField && !pt[timeField]) {
                self.trigger('warning', self.runtime_error('RT-POINT-MISSING-TIME', {field: timeField}));
            }

            var time = pt[timeField || 'time'];
            if (time) { pt.time = time; }
        });

        juttle_utils.toNative(points);

        return points;
    }
}, {
    info: INFO
});

module.exports = source;

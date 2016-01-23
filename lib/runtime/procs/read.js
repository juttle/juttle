var _ = require('underscore');
var source = require('./source');
var adapters = require('../adapters');
var values = require('../values');
var JuttleLogger = require('../../logger');
var JuttleMoment = require('../../moment').JuttleMoment;
var Promise = require('bluebird');


var Read = source.extend({
    procName: 'read',

    initialize: function(options, params) {
        this.options = options;
        this.params = params;

        this.lag = _.has(options, 'lag') ? options.lag : new JuttleMoment.duration(0, 's');
        if (! this.lag.duration) {
            throw this.compile_error('RT-DURATION-ERROR', {
                option: 'lag',
                value: values.inspect(options.lag)
            });
        }

        this.readEvery = options.every || new JuttleMoment.duration(1, 's');
        if (! this.readEvery.duration) {
            throw this.compile_error('RT-DURATION-ERROR', {
                option: 'every',
                value: values.inspect(options.every)
            });
        }

        this.logger_name = this.logger_name.replace('read', 'read-' + params.adapter.name);
        this.logger = JuttleLogger.getLogger(this.logger_name);

        var adapter = adapters.get(params.adapter.name, params.adapter.location);
        if (!adapter.read) {
            throw this.compile_error('JUTTLE-UNSUPPORTED-ADAPTER-MODE', {
                adapter: params.adapter.name,
                method: 'read'
            });
        }

        // This block is a temporary hack until all the adapters are converted
        // over to use the new API.
        //
        // Before instantiating the adapter, check if it is actually an
        // implementation of a proc. If so, then it is a "legacy" adapter and
        // needs to be shimmed so that all the methods that it might call to
        // output points actually delegate to this class' implementation which
        // is the one that's actually wired into the flowgraph.
        if (adapter.read.__super__ && adapter.read.__super__.constructor === source) {
            this.logger.debug('instantiating legacy adapter:', params.adapter.name);
            this.adapter = new adapter.read(options, params, this.location, this.program);

            this.adapter.emit = _.bind(this.emit, this);
            this.adapter.emit_tick = _.bind(this.emit_tick, this);
            this.adapter.emit_eof = _.bind(this.emit_eof, this);
            this.adapter.trigger = _.bind(this.trigger, this);

            this.start = _.bind(this.adapter.start, this.adapter);
            this.teardown = _.bind(this.adapter.teardown, this.adapter);

            return;
        }

        this.handleTimeOptions(options);

        params.now = this.program.now;
        params.logger_name = this.logger_name;

        // To abstract away any knowledge of -last from the adapters,
        // massage the options as if the user used -from and -to
        if (options.last) {
            delete options.last;
            options.from = this.from;
            options.to = this.to;
        }

        this.logger.debug('instantiating adapter:', params.adapter.name);
        try {
            this.adapter = new adapter.read(options, params);
        } catch(err) {
            if (err.info) {
                err.info.location = this.location;
            }
            throw err;
        }

        this.setDefaultTimeRange(this.adapter.timedSource);

        this.adapter.on('error', (err) => {
            this.trigger('error', err);
        });

        this.adapter.on('warning', (err) => {
            this.trigger('warning', err);
        });

        // The adapter is responsible for setting the time defaults so once
        // only once that's done do we set the nextTick time.
        this.nextTick = JuttleMoment.max(this.program.now, this.from);
    },

    // Adapters fall into two general categories when it comes to the treatment
    // of time:
    //
    // On the one hand, there are backend databases where time is an important
    // dimension, e.g. elastic search, influxdb, graphite, etc. For these, both
    // `-from` and `-to` default to :now:, but the user needs to specify at
    // least one of the two parameters. Furthermore, "live" mode is implemented
    // by periodically polling the backend for new points.
    //
    // For all other cases, including simple one-shot reads like file or http,
    // truly live sources, or sources of likely timeless data points like SQL,
    // the user need not specify a time parameter and the default the time range
    // is unbounded.
    //
    // These two cases are distinguished by the `timedSource` parameter, which
    // both sets the appropriate defaults for `from` and `to` and affects how
    // the live mode is handled.
    setDefaultTimeRange: function(timedSource) {
        this.timedSource = timedSource;

        if (timedSource) {
            if (!this.from && !this.to) {
                throw this.compile_error('RT-MISSING-TIME-RANGE-ERROR');
            }
            this.from = this.from || this.program.now;
            this.to = this.to || this.program.now;
        } else {
            this.from = this.from || new JuttleMoment(0);
            this.to = this.to || new JuttleMoment(Infinity);
        }
    },

    // Set the initial time parameters for read from the adapter and
    // schedule the initial run.
    start: function() {
        // For non-timed sources, we simply read for the full time range and
        // leave it up to the adapter itself to page through the results and
        // eventually indicate that it's done.
        if (!this.timedSource) {
            this.readFrom = this.from;
            this.readTo = this.to;
            this.run();
        }
        // Otherwise for timed sources, if from is in the past or to is finite,
        // then the program starts off in historical mode. Once the historical
        // portion of the read is complete, then it will either complete the
        // full query (if `to` is finite) or transition into live mode if `to`
        // is `:end:`. In the latter case, we stop the historical part of the
        // query at now - lag since we'll pick up from there after waiting the
        // appropriate amount of time.
        //
        // This all totally breaks down if there is any clock skew between the
        // juttle runtime and the data points in the back end.
        else if (this.from.lt(this.program.now) || !this.to.isEnd()) {
            this.readFrom = this.from;
            if (this.to.isEnd()) {
                // XXX/demmer need to handle the case where now - lag > from
                this.readTo = this.program.now.subtract(this.lag);
            } else {
                this.readTo = this.to;
            }
            this.logger.debug('starting historical read at', this.program.now.toJSON(),
                              'from', this.readFrom.toJSON(), 'to', this.readTo.toJSON());
            this.run();
        }
        // For fully "live", the first chunk of points to read is from
        // [now ... now + readEvery).
        //
        // So before we can actually read this initial set of points are
        // read, we need to wait for both the readEvery period as well as
        // the lag time to pass.
        else {
            this.readFrom = this.program.now;
            this.readTo = this.program.now.add(this.readEvery);
            var firstRead = this.program.now.add(this.readEvery).add(this.lag);
            this.logger.debug('scheduling first live read at', firstRead.toJSON());
            this.program.scheduler.schedule(firstRead.unixms(), _.bind(this.run, this));
        }
    },

    // Kick off a read iteration from the adapter.
    run: function() {
        if (this.reading) {
            throw new Error('run should not be called while reading');
        }
        this.logger.debug('read from', this.readFrom.toJSON(),
                          'to', this.readTo.toJSON(),
                          'limit', this.queueSize, 'state', this.readState);

        this.reading = Promise.try(() => {
            return this.adapter.read(this.readFrom, this.readTo, this.queueSize, this.readState);
        })
        .then((result) => {
            this.reading = null;

            if (result.points && result.points.length !== 0) {
                this.logger.debug('read returned', result.points.length, 'points');
                this.enqueue(result.points);
            } else {
                this.logger.debug('read returned no points');
            }

            this.readState = result.state;

            // Check if we are being torn down.
            if (this.inTeardown) {
                return;
            }

            // The adapter indicates that it's completed reading all points up
            // to the given end time by returning the ending time in readEnd.
            //
            // Notify the base class so it can emit any necessary ticks and
            // check if we're all done, or call us back when it is time to
            // reschedule.
            //
            // Otherwise we need to reschedule another call.
            if (result.readEnd) {
                this.advance(result.readEnd);
            } else {
                this.moreToRead = true;

                // XXX this should be done by the scheduler once it drains the
                // buffer.
                this.schedule();
            }
        })
        .catch((err) => {
            this.logger.debug('read returned error', err.toString());
            this.trigger('error', err);
            this.emit_eof();
        });
    },

    // Based on whether or not the current read is completed, update the time
    // bounds and schedule another read.
    //
    // XXX this will need to be reworked to interact with the flow control
    // scheduler.
    schedule: function() {
        if (! this.moreToRead) {
            // If to is not :end: then this is a purely historical read, so once
            // it is done with the initial batch, we can simply emit eof and
            // be done.
            if (! this.to.isEnd()) {
                this.logger.debug('read done for historical source. emitting eof.');
                this.emit_eof();
                return;
            }

            // Otherwise, advance the readFrom and readTo bounds and schedule a
            // callback for the next time we should read.
            this.readFrom = this.readTo;
            this.readTo = this.readFrom.add(this.readEvery);
            var nextRead = this.readTo.add(this.lag);
            this.logger.debug('scheduling next read at', nextRead.toJSON());
            this.program.scheduler.schedule(nextRead.unixms(), _.bind(this.run, this));
        } else {
            // There's more to read in the current time period, so ask the
            // scheduler to call us back and read more.
            this.program.scheduler.schedule(this.program.scheduler.now(), _.bind(this.run, this));
        }
    },

    teardown: function() {
        if (! this.reading) {
            this.emit_eof();
        } else {
            this.reading.then(() => {
                this.emit_eof();
            });
        }
    }
});

module.exports = Read;

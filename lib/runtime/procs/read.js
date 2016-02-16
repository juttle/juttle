'use strict';

var _ = require('underscore');
var source = require('./source');
var adapters = require('../adapters');
var values = require('../values');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var Promise = require('bluebird');

var Read = source.extend({
    initialize: function(options, params, location, program) {
        var adapter = adapters.get(params.adapter.name, params.adapter.location);
        if (!adapter.read) {
            throw this.compile_error('JUTTLE-UNSUPPORTED-ADAPTER-MODE', {
                adapter: params.adapter.name,
                method: 'read'
            });
        }

        this.handleTimeOptions(options);

        params.now = this.program.now;
        params.logger_name = this.logger_name;

        this.logger.debug('instantiating adapter:', params.adapter.name);
        try {
            this.adapter = new adapter.read(options, params);
        } catch(err) {
            if (err.info && !err.info.location) {
                err.info.location = this.location;
            }
            throw err;
        }

        this.validate_options(adapter.read.allowedOptions(), adapter.read.requiredOptions());

        var defaultTimeOptions = this.adapter.defaultTimeOptions();
        this.from = this.options.from || defaultTimeOptions.from;
        this.to = this.options.to || defaultTimeOptions.to;
        this.lag = options.lag || defaultTimeOptions.lag || JuttleMoment.duration(0, 's');
        this.readEvery = options.every || defaultTimeOptions.every || JuttleMoment.duration(1, 's');

        if (! this.lag.duration) {
            throw this.compile_error('DURATION-ERROR', {
                option: 'lag',
                value: values.inspect(options.lag)
            });
        }

        if (! this.readEvery.duration) {
            throw this.compile_error('DURATION-ERROR', {
                option: 'every',
                value: values.inspect(options.every)
            });
        }

        this.adapter.on('error', (err) => {
            this.trigger('error', err);
        });

        this.adapter.on('warning', (err) => {
            this.trigger('warning', err);
        });

        this.nextTick = this.program.now;
    },

    procName: function() {
        return 'read-' + this.params.adapter.name;
    },

    // Set the initial time parameters for read from the adapter and
    // schedule the initial run.
    start: function() {
        // First tell the adapter to kick off the process of reading.
        this.adapter.start();

        // Then check if the adapter wants pseudo-live behavior for reading.
        //
        // If not, then simply call into the adapter with the time bounds (if
        // any) that were set in the options. The adapter is responsible for
        // handling the potentially undefined values.
        if (! this.adapter.periodicLiveRead()) {
            this.readFrom = this.from;
            this.readTo = this.to;
            this.run();
            return;
        }

        // Otherwise for all sources that want periodic live reads, from and to
        // must have been set to valid moments, so use them to calculate the
        // time bounds for reading.
        //
        // If from is in the past or to is finite, then the program starts off
        // in historical mode. Once the historical portion of the read is
        // complete, then it will either complete the full query (if `to` is
        // finite) or transition into live mode if `to` is `:end:`. In the
        // latter case, we stop the historical part of the query at (now - lag)
        // since we'll pick up from there after waiting the appropriate amount
        // of time.
        //
        // XXX This all totally breaks down if there is any clock skew between
        // the juttle runtime and the data points in the back end.
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

        if (this.eofSent) {
            this.logger.debug('run called after eof sent... ignoring stale callback');
            return;
        }

        this.logger.debug('read from', this.readFrom ? this.readFrom.toJSON() : '(null)',
                          'to', this.readTo ? this.readTo.toJSON() : '(null)',
                          'limit', this.queueSize);

        this.reading = Promise.try(() => {
            return this.adapter.read(this.readFrom, this.readTo, this.queueSize, this.readState);
        })
        .then((result) => {
            this.reading = null;

            if (result.points && result.points.length !== 0) {
                this.logger.debug('read returned', result.points.length, 'points',
                                  'readEnd', result.readEnd ? result.readEnd.toJSON() : 'null');
                this.enqueue(result.points);
            } else {
                this.logger.debug('read returned no points');
            }

            this.readState = result.state;

            // The adapter indicates that it's completed reading all points up
            // to the given end time by returning the ending time in readEnd.
            var nextRead;
            if (result.readEnd) {
                // Once the full read time range has been read, we're all done
                if (result.readEnd.isEnd() || (this.to && result.readEnd.eq(this.to))) {
                    this.logger.debug('read done');
                    this.emit_eof();
                    return;
                }

                // Otherwise emit any necessary ticks to cover a gap in time
                // since the last point emitted up to the point at which the
                // adapter indicated no more data will come.
                this.emitTicks(result.readEnd);

                // Now check if we've read the entire current batch (i.e.
                // readEnd == readTo) and if so, advance the batch, otherwise
                // just move the readFrom marker forward. Either way, call into
                // the adapter after the lag time passes
                if (result.readEnd.eq(this.readTo)) {
                    this.readFrom = this.readTo;
                    this.readTo = this.readFrom.add(this.readEvery);
                } else {
                    this.readFrom = result.readEnd;
                }
                nextRead = this.readTo.add(this.lag);
            } else {
                // If there's more to read in the current batch, then
                // immediately schedule a callback to read more.
                nextRead = new JuttleMoment();
            }

            this.program.scheduler.schedule(nextRead.unixms(), _.bind(this.run, this));
        })
        .catch((err) => {
            this.reading = null;
            this.logger.debug('read returned error', err.toString());
            this.trigger('error', err);
            this.emit_eof();
        });
    },

    teardown: function() {
        var readDone = this.reading || Promise.resolve();

        readDone
        .then(() => {
            return this.adapter.teardown();
        })
        .then(() => {
            this.emit_eof();
        });
    },

    emit_eof: function() {
        if (!this.eofSent) {
            this.eofSent = true;
            source.prototype.emit_eof.call(this);
        }
    }
});

module.exports = Read;

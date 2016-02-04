'use strict';

//
// base class for all sources
//

var juttle_utils = require('../juttle-utils');
var values = require('../values');
var JuttleMoment = require('../../runtime/types/juttle-moment');

var base = require('./base');

var INFO = {
    type: 'source',
    options: {
        from: {},
        to: {},
        last: {},
        queueSize: {}
    }
};

var source = base.extend({
    initialize: function(options, params) {
        this.queue = [];
        this.queueSize = options.queueSize || 100000;

        this.lastEmit = new JuttleMoment(0);
        this.tickEvery = JuttleMoment.duration(1, 's');
        this.nextTick = this.program.now.add(this.tickEvery);
    },

    // Process the common time options (from / to / last) to ensure they are all
    // the correct types and to convert `last` into the corresponding from/to
    // combinations.
    //
    // If the time selection is valid, it is stored in `this.from` and
    // `this.to`.
    handleTimeOptions: function(options) {
        if (options.from) {
            if (! options.from.moment) {
                throw this.compile_error('MOMENT-ERROR', {
                    option: 'from',
                    value: values.inspect(options.from)
                });
            }
        }

        if (options.to) {
            if (!options.to.moment) {
                throw this.compile_error('MOMENT-ERROR', {
                    option: 'to',
                    value: values.inspect(options.to)
                });
            }

            if (options.from && options.from.gt(options.to)) {
                throw this.compile_error('TO-BEFORE-FROM-MOMENT-ERROR');
            }
        }

        if (options.last) {
            if (!options.last.duration) {
                throw this.compile_error('DURATION-ERROR', {
                    option: 'last',
                    value: values.inspect(options.last)
                });
            }

            if (options.from || options.to) {
                throw this.compile_error('LAST-FROM-TO-ERROR');
            }

            // Since -last is just a shortcut, make it look to the adapter
            // like the user just passed -from and -to
            options.to = this.program.now;
            options.from = options.to.subtract(options.last);
            delete options.last;
        }
    },

    // Assigns the time from timeField to 'time' and attempts to convert it
    // into JuttleMoment
    //
    // If not specified, timeField defaults to 'time'. If specified and point
    // is missing that field, emits a warning.
    //
    // XXX/demmer this can be removed once all adapters have been converted
    // over to the new adapter read API.
    parseTime: function(points, timeField) {
        return juttle_utils.parseTime(points, timeField, this);
    },

    // Callback from the subclass to indicate that points have been produced
    // and are ready to be emitted.
    //
    // XXX once we actually implement a flow control scheduler, this should push
    // the points onto a queue and then rely on interactions with the scheduler
    // to drain the queue before rescheduling. For now it just emits
    // immediately.
    enqueue: function(points, output) {
        this.emit(points, output);
        var lastPt = points[points.length - 1];
        if (lastPt.time) {
            this.lastEmit = lastPt.time;
        }
    },

    // Send ticks downstream if `tickEvery` has elapsed between the last emitted
    // point (stored in `this.lastEmit)` and `to`, which is set by the source to
    // be time up to which the adapter has read all the data.
    emitTicks: function(to) {
        while (this.nextTick.lt(to)) {
            if (this.nextTick.gt(this.lastEmit)) {
                this.emit_tick(this.nextTick);
            }
            this.nextTick = this.nextTick.add(this.tickEvery);
        }
    }
}, {
    info: INFO
});

module.exports = source;

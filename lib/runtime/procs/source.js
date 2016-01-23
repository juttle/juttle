'use strict';

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
        last: {}
    }
};

var source = base.extend({
    initialize: function(options, params) {
    },

    // Process the common time options (from / to / last) to ensure they are all
    // the correct types and to convert `last` into the corresponding from/to
    // combinations.
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
    },

    // Set defaults for this.from and this.to if not specified.
    //
    // If required is true, then from and to default to now, but an
    // error is thrown if neither is supplied.
    //
    // If required is falsy, then from defaults to :0: and to defaults to
    // :end:.
    setDefaultTimeRange: function(required) {
        if (required) {
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

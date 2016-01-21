var _ = require('underscore');
var JuttleMoment = require('../../moment').JuttleMoment;
var source = require('./source');
var values = require('../values');
var Promise = require('bluebird');

var INFO = {
    type: 'source',
    options: _.extend({   // documented, non-deprecated options only
        every: {},
        limit: {},
        points: {}
    }, source.info.options),
    _options: {   // hidden or deprecated options
        hz: {},
        _output: {}
    }
};

var emit = source.extend({
    initialize: function(options) {
        var NOW = this.program.now;
        var unknown = _.difference(_.keys(options),
                                   _.union(_.keys(INFO.options), _.keys(INFO._options)));
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'emit',
                option: unknown[0]
            });
        }

        this.handleTimeOptions(options, this.DEFAULT_TIME_RANGE.NONE);

        if (_.has(options, 'every') && !options.every.duration) {
            throw this.compile_error('RT-DURATION-ERROR', {
                option: 'every',
                value: values.inspect(options.every)
            });
        }
        if (_.has(options, 'limit') && !_.isNumber(options.limit)) {
            throw this.compile_error('RT-NUMBER-ERROR', {
                option: 'limit',
                value: values.inspect(options.limit)
            });
        }
        if (_.has(options, 'hz') && !_.isNumber(options.hz)) {
            throw this.compile_error('RT-NUMBER-ERROR', {
                option: 'hz',
                value: values.inspect(options.hz)
            });
        }
        if (this.to && _.has(options, 'limit')) {
            throw this.compile_error('RT-EMIT-TO-LIMIT-ERROR');
        }
        if (_.has(options, 'points')) {
            if (_.has(options, 'to') || _.has(options, 'limit')) {
                throw this.compile_error('RT-EMIT-POINTS-LIMIT-ERROR');
            }
            if (!Array.isArray(options.points)) {
                throw this.compile_error('RT-EMIT-POINTS-ARRAY-ERROR');
            }
            if (!options.points.every(_.isObject)) {
                throw this.compile_error('RT-EMIT-POINTS-ARRAY-ERROR');
            }
            var time_points = options.points.filter(function(pt) { return _.has(pt, 'time'); });
            if (!_.isEmpty(time_points) && time_points.length !== options.points.length) {
                throw this.compile_error('RT-EMIT-MIXED-POINTS-ERROR');
            }
            if ((_.has(options, 'from') || _.has(options, 'every'))
                && !_.isEmpty(time_points)) {
                throw this.compile_error('RT-EMIT-POINTS-FROM-ERROR');
            }
            this.points = options.points ;
            if (!_.isEmpty(time_points)) {
                // be kind to JSON cut-and-pasters and parse numbers and strings
                // as moments when possible.
                try {
                    this.points = this.points.map(function(pt) {
                        return _.extend({}, pt, {time: new JuttleMoment(pt.time)});
                    });
                } catch (error) {
                    throw this.compile_error('RT-INVALID-JSON-TIME-ERROR');
                }
            }
        }

        this._output = options._output;
        this.from = this.from || NOW;
        this.to = this.to || NOW;
        this.every = (options.every
                      || (_.has(options, 'hz') && JuttleMoment.duration(1/options.hz,'s'))
                      || JuttleMoment.duration(1,'s'));

        // the order of these ifs is important as they dictate how the limit gets set
        if (_.has(options, 'limit')) {
            this.limit = options.limit;
        } else if (_.has(options, 'points')) {
            this.limit = this.points.length;
        } else if (_.has(options, 'to') || _.has(options, 'from') || _.has(options, 'last')) {
            this.limit = this.to.isEnd() ? Infinity : this.to.subtract(this.from).divide(this.every);
        } else {
            this.limit = 1;
        }

        // This is a bit roundabout, but when running with -limit and no
        // -from/-to time bounds, the desired behavior is to generate the given
        // number of points in "live" mode and then emit an eof.
        //
        // To accomplish this, first set to to be :end: but then once the limit
        // is reached, we set `to` to something finite so that the source base
        // class will switch back into "historical mode" and know we are truly
        // done and not just done with the current batch.
        if (this.from === NOW && this.to === NOW) {
            this.to = new JuttleMoment(Infinity);
        }

        this.next_time = this.from;
        this.n = 0;
        if (!_.isEmpty(this.points) && !_.first(this.points).time) {
            // fill in point times using from/every
            this.points = this.points.map(function(pt, i) {
                return _.extend({time: this.from.add(this.every.multiply(i))}, pt);
            }, this);
        }
    },

    procName: 'emit',

    read: function(from, to, limit, state) {
        var points = [];
        var done = false;
        while (points.length < limit) {
            var pt = this.next_point();
            if (!pt) {
                // see comment above for why we do this
                this.to = to;
                done = true;
                break;
            }

            if (pt.time && pt.time.gte(to)) {
                done = true;
                break;
            }

            points.push(pt);
            this.advance();
        }

        return Promise.resolve({
            points: points,
            done: done
        });
    },

    next_point: function() {
        if (this.n >= this.limit) {
            return null;
        }
        if (this.points) {
            return this.points[this.n];
        } else {
            return {time: this.next_time};
        }
    },

    advance: function() {
        this.next_time = this.next_time.add(this.every);
        this.n++;
    }
}, {
    info: INFO
});

module.exports = emit;

var _ = require('underscore');
var JuttleMoment = require('../../moment').JuttleMoment;
var source = require('./source');
var values = require('../values');

var INFO = {
    type: 'source',
    options: {   // documented, non-deprecated options only
        every: {},
        from: {},
        limit: {},
        points: {},
        to: {},
    },
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
        if (_.has(options, 'every') && !options.every.duration) {
            throw this.compile_error('RT-DURATION-ERROR', {
                option: 'every',
                value: values.inspect(options.every)
            });
        }
        if (_.has(options, 'from') && !options.from.moment) {
            throw this.compile_error('RT-MOMENT-ERROR', {
                option: 'from',
                value: values.inspect(options.from)
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
        if (_.has(options, 'to') && !options.to.moment) {
            throw this.compile_error('RT-MOMENT-ERROR', {
                option: 'to',
                value: values.inspect(options.to)
            });
        }
        if (_.has(options, 'to') && _.has(options, 'limit')) {
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
        // default -from/-to to now when they're not set
        this.from = options.from || (_.isEmpty(this.points) ? null : _.first(this.points).time) || NOW;
        this.to = options.to || (_.isEmpty(this.points) ? null : _.last(this.points).time) || NOW;
        this.every = (options.every
                      || (_.has(options, 'hz') && JuttleMoment.duration(1/options.hz,'s'))
                      || JuttleMoment.duration(1,'s'));
        this.tick_every = JuttleMoment.duration(1,'s');

        // the order of these ifs is important as they dictate how the limit gets set
        if (_.has(options, 'limit')) {
            this.limit = options.limit;
        } else if (_.has(options, 'points')) {
            this.limit = this.points.length;
        } else if (_.has(options, 'to') || _.has(options, 'from')) {
            this.limit = this.to.subtract(this.from).divide(this.every);
        } else {
            this.limit = 1;
        }
        this.next_time = this.from;
        this.n = 0;
        this.next_tick = JuttleMoment.max(NOW, this.from);
        if (!_.isEmpty(this.points) && !_.first(this.points).time) {
            // fill in point times using from/every
            this.points = this.points.map(function(pt, i) {
                return _.extend({time: this.from.add(this.every.multiply(i))}, pt);
            }, this);
        }
    },
    procName:  'emit',
    start: function() {
        var ts = this.start_time();
        if (ts) {
            this.kick(ts);
        } else {
            this.emit_eof();
        }
    },
    next_point: function(advance) {
        if (this.n < this.limit) {
            var pt = this.points ? this.points[this.n] : {time: this.next_time};
            if (advance) {
                this.next_time = this.next_time.add(this.every);
                this.n++;
            }
            return pt;
        } else {
            return null;
        }
    },
    start_time: function() {
        var pt = this.next_point(false);
        return pt ? pt.time : null;
    },
    kick: function(ts) {
        var self = this;
        this.program.scheduler.schedule(ts.unixms(),
        function() { self.run(); });
    },
    run: function() {
        var ts;
        var pt = this.next_point(true);
        if (pt) {
            this.emit_ticks(pt.time);
            this.emit([pt], this._output);
            ts = this.start_time();
            if (ts) {
                this.kick(ts);
                return;
            }
        }
        this.emit_eof();
    },
    emit_ticks: function(to) {
        while (this.next_tick.lt(to)) {
            this.emit_tick(this.next_tick);
            this.next_tick = this.next_tick.add(this.tick_every);
        }
    }
}, {
    info: INFO
});

module.exports = emit;

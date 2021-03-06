'use strict';

var _ = require('underscore');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var source = require('./source');
var values = require('../values');

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

class emit extends source {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        var NOW = this.program.now;
        var allowedOptions = _.union(_.keys(INFO.options), _.keys(INFO._options));
        this.validate_options(allowedOptions);

        this.teardown_received = false;

        this.handleTimeOptions(options);

        if (_.has(options, 'every') && !options.every.duration) {
            throw this.compile_error('DURATION-ERROR', {
                option: 'every',
                value: values.inspect(options.every)
            });
        }
        if (_.has(options, 'limit') && !_.isNumber(options.limit)) {
            throw this.compile_error('NUMBER-ERROR', {
                option: 'limit',
                value: values.inspect(options.limit)
            });
        }
        if (_.has(options, 'hz') && !_.isNumber(options.hz)) {
            throw this.compile_error('NUMBER-ERROR', {
                option: 'hz',
                value: values.inspect(options.hz)
            });
        }
        if (options.to && _.has(options, 'limit')) {
            throw this.compile_error('INCOMPATIBLE-OPTION', {
                option: 'to',
                other: 'limit'
            });
        }
        if (_.has(options, 'points')) {
            // Invalid option combinations
            if (_.has(options, 'to') || _.has(options, 'from')) {
                throw this.compile_error('OPTION-FROM-TO-ERROR', {
                    option: 'points'
                });
            }

            if (_.has(options, 'limit')) {
                throw this.compile_error('INCOMPATIBLE-OPTION', {
                    option: 'points',
                    other: 'limit'
                });
            }

            if (_.has(options, 'every')) {
                throw this.compile_error('INCOMPATIBLE-OPTION', {
                    option: 'points',
                    other: 'every'
                });
            }

            // Format
            if (!Array.isArray(options.points)) {
                throw this.compile_error('EMIT-POINTS-ARRAY-ERROR');
            }
            if (!options.points.every(_.isObject)) {
                throw this.compile_error('EMIT-POINTS-ARRAY-ERROR');
            }

            var time_points = options.points.filter(function(pt) { return _.has(pt, 'time'); });
            if (!_.isEmpty(time_points) && time_points.length !== options.points.length) {
                throw this.compile_error('EMIT-MIXED-POINTS-ERROR');
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
                    throw this.compile_error('INVALID-JSON-TIME');
                }
            }
        }

        // Specify this to redirect output of this emit to a group of different
        // nodes in the flowgraph named `this._output`, usually sinks. Needed
        // when the intermediate operation (like reduce) was optimized and can
        // be skipped.
        this._output = options._output;

        // default -from/-to to now when they're not set
        this.from = options.from || NOW;
        this.to = options.to || NOW;
        this.every = (options.every
                      || (_.has(options, 'hz') && JuttleMoment.duration(1/options.hz,'s'))
                      || JuttleMoment.duration(1,'s'));
        this.nextTick = JuttleMoment.max(this.from, NOW);

        // the order of these ifs is important as they dictate how the limit gets set
        if (_.has(options, 'limit')) {
            this.limit = options.limit;
        } else if (_.has(options, 'points')) {
            this.limit = this.points.length;
        } else if (_.has(options, 'to') || _.has(options, 'from') || _.has(options, 'last')) {
            this.limit = this.to.subtract(this.from).divide(this.every);
        } else {
            this.limit = 1;
        }
        this.next_time = this.from;
        this.n = 0;
    }
    procName() {
        return 'emit';
    }
    start() {
        var ts = this.next_run();
        if (ts) {
            this.schedule(ts);
        } else {
            // Emit timeless points at once
            if (this.points) {
                this.emit(this.points, this._output);
            }
            this.emit_eof();
        }
    }
    next_point(advance) {
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
    }
    next_run() {
        var pt = this.next_point(false);
        if (!pt) {
            return null;
        }
        if (pt.time) {
            return JuttleMoment.min(pt.time, this.nextTick);
        } else {
            return new JuttleMoment(0);
        }
    }
    schedule(ts) {
        var self = this;
        this.program.scheduler.schedule(ts.unixms(),
        function() { self.run(ts); });
    }
    run(ts) {
        // If we received a teardown, just emit an eof and don't
        // schedule any more work.
        if (this.teardown_received) {
            this.emit_eof();
            return;
        }

        // Check if it's time to send the next point or emit ticks
        var pt = this.next_point(false);
        if (!pt.time || pt.time.lte(ts)) {
            pt = this.next_point(true);
            this.enqueue([pt], this._output);
        } else {
            this.emitTicks(pt.time);
        }
        ts = this.next_run();
        if (ts) {
            this.schedule(ts);
        } else {
            this.emit_eof();
        }
    }

    teardown() {
        this.logger.debug('Got teardown, scheduling eof');
        this.teardown_received = true;
    }


    static get info() {
        return INFO;
    }
}

module.exports = emit;

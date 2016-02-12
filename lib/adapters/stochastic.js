'use strict';

var _ = require('underscore');
var stoke = require('../runtime/procs/stoke');
var values = require('../runtime/values');
var JuttleMoment = require('../runtime/types/juttle-moment');
var AdapterRead = require('./adapter-read');
var errors = require('../errors');

class ReadStochastic extends AdapterRead {
    //
    // abstract stochastic proc object. extend this to override start()/step() and you're done.
    // we'll do the rest.
    //
    constructor(options, params) {
        super(options, params);

        var NOW = params.now;
        this.now = NOW;
        this.rt_step = JuttleMoment.duration(1);
        this.max_samples = options.max_samples || 100 ;
        // options.source is either the source name (string), or a
        // configuration object for the source. hoist any options.source
        // object fields up into the options object.
        var source = options.source;
        if (_.isObject(options.source)) {
            source = options.source.name;
            options = _.extend(_(options.source).clone(), options);
            delete options.source;
        }
        this.type = options.type;
        if (this.type && this.type !== 'metric' && this.type !== 'event') {
            throw new errors.compileError('METRICS-OR-EVENTS');
        }

        if (!options.from && !options.to) {
            throw new errors.compileError('MISSING-TIME-RANGE');
        }

        this.from = options.from || this.now;
        this.to = options.to || this.now;

        if (this.from.isBeginning()) {
            throw errors.compileError('ADAPTER-UNSUPPORTED-TIME-OPTION', {
                proc: 'read stochastic',
                option: 'from',
                message: 'value must be finite'
            });
        }

        this.historic = this.from.lt(NOW);
        this.realtime = this.to.gt(NOW);

        var end_history = JuttleMoment.min(this.to, NOW);
        var span = end_history.subtract(this.from);
        if (!options.every && this.historic) {
            this.every = stoke.util.nice_steps(span, this.max_samples);
        } else if (!options.every) {
            this.every = this.rt_step;
        } else if (!options.every.duration) {
            throw new errors.compileError('DURATION-ERROR', {
                option: 'every',
                value: values.inspect(options.every)
            });
        } else {
            this.every = options.every;
            this.max_samples = Math.ceil(span.divide(this.every)) ;
        }
        this.rt_step = this.every;
        // quantize this.from, as if every was a batch interval.
        // a special step will be taken to realtime.
        this.from = JuttleMoment.quantize(this.from,this.every) ;

        // for historic playback with many steps, take an occasional
        // pause for the cause
        if (_(options.draw_steps).isNumber()) {
            this.draw_steps = options.draw_steps;
        } else if (this.historic) {
            this.draw_steps = Math.min(this.max_samples, 100) ;
        } else {
            this.draw_steps = 0;
        }

        this.source = stoke.make_source(source, options, params, this.from, this.to, this.every, NOW, this.location);
        this.timer = null;
        this.next_t = this.from;
        this.tick_timer = null;
        this.tick_interval = JuttleMoment.duration(1);
        this.next_tick = null;
        this.total_points = 0;
        this.total_elapsed = 0;
    }

    static allowedOptions() {
        return AdapterRead.commonOptions().concat(['source', 'logType', 'lpm',
            'nhosts', 'debug', 'daily', 'index_demand', 'authentication_demand',
            'ripple', 'ripple_alpha', 'auth_demand', 'cpu_cv', 'cpu_dc', 'dos',
            'syslog_max_lines', 'syslog_lpm', 'syslog_thresh', 'syslog_max_lpm',
            'statusp', 'host_names', 'dos_id', 'type']);
    }

    periodicLiveRead() {
        return true;
    }

    read(from, to, limit, state) {
        var self = this;
        var now_ms = Date.now();
        var then = this.now;
        var out = [];
        var errors = [];
        var step_to = JuttleMoment.min(this.next_t.add(this.every), to);
        for (var i = this.draw_steps ; !this.draw_steps || i > 0; i--) {
            if (this.realtime && step_to.gt(then) && this.every.gt(this.rt_step)) {
                // shifting to real time. change the step size and recalculate step
                this.every = this.rt_step;
                step_to = JuttleMoment.quantize(then, this.every);
                if (step_to.lte(this.next_t)) {
                    // quantization collapsed our step
                    step_to = step_to.add(this.every) ;
                }
                step_to = JuttleMoment.min(step_to, this.to);
            }
            if (step_to.gt(to)) {
                break; // finished this batch
            }
            var by = step_to.subtract(this.next_t);
            this.logger.debug('run step', i, 'stepping from',
                this.next_t.valueOf(), 'to', step_to.valueOf(), 'by', by.valueOf());

            try {
                this.step(this.next_t, step_to, by, out, errors);
            } catch (error) {
                this.trigger('error', error);
                this.next_t = null ; // we're done!
                break ;
            }
            if (this.next_t.eq(this.to)) {
                this.next_t = null ; // we're done!
                break ;
            }
            this.next_t = step_to;
            step_to = JuttleMoment.min(this.next_t.add(this.every), this.to);
        }
        out.sort(function sortbytime(a, b) {
            return a.time.subtract(b.time).milliseconds();
        });

        _.forEach(errors, function(error) {
            self.trigger('warning', error);
        });

        this.total_points += out.length;
        this.total_elapsed += Date.now() - now_ms;

        var done = this.source.eof() || !this.next_t || step_to.gte(to);
        this.logger.debug('adapter batch complete:',
            'points:', this.total_points,
            'elapsed:', this.total_elapsed,
            'pps:', 1000 * this.total_points / this.total_elapsed);

        return {
            points: out,
            readEnd: done ? to : null
        };
    }

    step(from, to, by, out, errors) {
        if (!this.type || this.type === 'event') {
            this.source.step_events(from, to, by, out, errors);
        }
        if (!this.type || this.type === 'metric') {
            this.source.step_metrics(from, to, by, out, errors);
        }
    }
}

function StochasticAdapter(config) {
    return {
        name: 'stochastic',
        read: ReadStochastic
    };
}

module.exports = StochasticAdapter;

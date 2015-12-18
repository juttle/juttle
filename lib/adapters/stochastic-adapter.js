var _ = require('underscore');
var stoke = require('../runtime/procs/stoke');
var values = require('../runtime/values');
var JuttleMoment = require('../moment').JuttleMoment;
var Juttle = require('../runtime/index').Juttle;

var Read = Juttle.proc.source.extend({
    sourceType: 'any',
    procName:  'read-stochastic',

    //
    // abstract stochastic proc object. extend this to override start()/step() and you're done.
    // we'll do the rest.
    //
    initialize: function(options, filter, pname, location, program) {
        var NOW = this.program.now;
        var FOREVER = new JuttleMoment(Number.POSITIVE_INFINITY);
        this.tick_interval = JuttleMoment.duration(1);
        this.rt_step = this.tick_interval; // stepsize during realtime play
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
            throw this.compile_error('RT-METRICS-OR-EVENTS');
        }
        if (options.last) {
            if (options.from || options.to) {
                throw this.compile_error('RT-LAST-FROM-TO-ERROR');
            }
            options.to = NOW;
            options.from = options.to.subtract(options.last);
        }

        this.from = options.from || NOW;
        if (!this.from.moment) {
            throw this.compile_error('RT-FROM-TO-MOMENT-ERROR', {
                value: values.inspect(this.from)
            });
        }
        this.historic = this.from.lt(NOW);

        this.to = options.to || FOREVER;
        if (!this.to.moment) {
            throw this.compile_error('RT-FROM-TO-MOMENT-ERROR', {
                value: values.inspect(this.to)
            });
        } else if (this.to.lt(this.from)) {
            throw this.compile_error('RT-TO-FROM-MOMENT-ERROR');
        }
        this.realtime = this.to.gt(NOW);

        var end_history = JuttleMoment.min(this.to, NOW);
        var span = end_history.subtract(this.from);
        if (!options.every && this.historic) {
            this.every = stoke.util.nice_steps(span, this.max_samples);
        } else if (!options.every) {
            this.every = this.rt_step;
        } else if (!options.every.duration) {
            throw this.compile_error('RT-DURATION-ERROR', {
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

        this.source = stoke.make_source(source, options, filter, this.from, this.to, this.every, NOW, this.location);
        this.timer = null;
        this.next_t = this.from;
        this.tick_timer = null;
        this.tick_interval = JuttleMoment.duration(1);
        this.next_tick = null;
        this.total_points = 0;
        this.total_elapsed = 0;
    },
    start: function() {
        this.run();
    },
    teardown: function() {
        this.emit_eof();
        clearTimeout(this.timer);
        clearTimeout(this.tick_timer);
    },
    process: function() {
        //XXX ignore...
        // user shouldn't hook up inputs to an emitter
        // maybe there should be some sort of type checking
        // to detect this and flag an error?
    },
    _tick_timer: function() {
        try {
            this.emit_tick(this.next_tick);
        }
        catch (err) {
            this.trigger('error', err);
        }
        this.next_tick = this.next_tick.add(this.tick_interval);

        var self = this;
        if (this.next_tick.lt(this.to)) {
            self.tick_timer = setTimeout(function() { self._tick_timer(); },
                                         this.tick_interval.milliseconds());
        }
    },
    run: function() {
        this._run = this._run.bind(this);
        this.timer = setTimeout(this._run, 0);
        if (this.historic) {
            this.emit_tick(this.from);
        }
    },
    _run: function() {
        var self = this;
        var now_ms = Date.now();
        var then = this.program.now;
        var out = [];
        var errors = [];
        var step_to = JuttleMoment.min(this.next_t.add(this.every), this.to);
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
            if (step_to.unixms() >= now_ms) {
                break ; // don't step into the future
            }
            var by = step_to.subtract(this.next_t);
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
        var last_time = (out.length) ? out[out.length-1].time : null;
        this.emit(out);
        _.forEach(errors, function(error) {
            self.trigger('warning', error);
        });

        this.total_points += out.length;
        this.total_elapsed += Date.now() - now_ms;
        now_ms = Date.now(); // time has passed...
        if (!this.source.eof() && this.next_t) {
            var timeout = Math.max(step_to.unixms() - now_ms, 0);
            this.timer = setTimeout(this._run, timeout);
            // for live, send out ticks to populate gaps in data
            if (timeout > 0 && last_time) {
                clearTimeout(this.tick_timer);
                this.next_tick = JuttleMoment
                    .quantize(last_time, this.tick_interval)
                    .add(this.tick_interval);
                this.tick_timer = setTimeout(
                    function() { self._tick_timer(); },
                    this.next_tick.unixms() - now_ms);
            }
        }
        else {
            if (this.to && this.to.lte(this.program.now)) {
                this.emit_tick(this.to);
            }
            this.emit_eof();
            clearTimeout(this.tick_timer);
            this.logger.debug('adapter run complete:',
                'points:', this.total_points,
                'elapsed:', this.total_elapsed,
                'pps:', 1000 * this.total_points / this.total_elapsed);
        }
    },
    step: function step(from, to, by, out, errors) {
        if (!this.type || this.type === 'event') {
            this.source.step_events(from, to, by, out, errors);
        }
        if (!this.type || this.type === 'metric') {
            this.source.step_metrics(from, to, by, out, errors);
        }
    }
});

function StochasticAdapter(config) {
    return {
        name: 'stochastic',
        read: Read
    };
}

module.exports = StochasticAdapter;

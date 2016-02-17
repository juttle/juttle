'use strict';

var _ = require('underscore');
var JuttleLogger = require('../../logger');
var errors = require('../../errors');

var DEFAULT_OUT_NAME = 'default';

class base {
    //
    // called by the default constructor
    //
    constructor(options, params, location, program) {
        this.options = options;
        this.params = params;
        var job_id;
        this.out_ = {};
        // linkage for building flowgraph in place
        // out[] is the array of established connections
        // head/tail allow append and expand to work until we can
        // decide what gets connected to what
        this.head = [ this ];
        this.tail = [ this ];
        this.ins = [];  // per-input state {from: proc}
        this.logged = {};
        this.location = location;
        this.program = program;
        this.stats = {points_in: 0, points_out: 0};
        this.last_used_output = DEFAULT_OUT_NAME;
        job_id = this.program.id ? '-' + this.program.id : '';
        this.logger_name = 'proc-' + this.procName() + job_id;
        this.logger = JuttleLogger.getLogger(this.logger_name);
        this.logger.debug('initializing', 'options:', JSON.stringify(options),
            'params:', JSON.stringify(params));
    }

    procName() {
        throw new Error('procName() not implemented');
    }

    validate_options(allowedOptions, requiredOptions) {
        var options = _.keys(this.options);
        var unknown = _.difference(options, allowedOptions);
        if (unknown.length > 0) {
            throw this.compile_error('UNKNOWN-OPTION', {
                proc: this.procName(),
                option: unknown[0]
            });
        }

        var missing = _.difference(requiredOptions, options);
        if (missing.length > 0) {
            throw this.compile_error('MISSING-OPTION', {
                proc: this.procName(),
                option: missing[0]
            });
        }
    }

    out(output_name) {
        output_name = output_name || DEFAULT_OUT_NAME;
        if (!this.out_.hasOwnProperty(output_name)) {
            this.out_[output_name] = [];
        }
        return this.out_[output_name];
    }
    out_names() {
        return Object.keys(this.out_);
    }
    //
    // called by gencode:JuttleEngine.activate during try_apply after
    // successful program compilation.
    //
    start() { }

    //
    // traverse the graph and call teardown once on every reachable proc
    // this would typically be called on the entry node
    //
    deactivate(mark) {
        if (this.visitMark !== mark) {
            this.visitMark = mark;
            _.each(this.out_, function(outputList) {
                _.each(outputList, function(output) {
                    output.proc.deactivate(mark);
                });
            });
            this.teardown();
        }
    }
    combine(proc) {
        var k;
        // append the head items from proc to this.head
        // and the tail items from proc to this.tail
        // so this proc becomes the combined, parallel flow graph
        for (k = 0; k < proc.head.length; ++k) {
            this.head.push(proc.head[k]);
        }
        for (k = 0; k < proc.tail.length; ++k) {
            this.tail.push(proc.tail[k]);
        }
    }
    //XXX need a disconnect method
    connect(proc) {
        var out = this.out();
        // add proc as a downstream consumer of our points.
        out.push({proc: proc, from: this});
        proc.connect_input(this);
        return true;
    }
    // Add a named shortcut link from this node to `target_proc`.
    // `name` can later be used by emit_xxx methods.
    // `logical_from_proc` is the proc that points sent over this
    // shortcut should appear to come from (for eof/mark fanin accounting purposes).
    shortcut(target, logical_from, name) {
        var out = this.out(name);
        // add proc as a downstream consumer of our points.
        out.push({proc: target, from:logical_from});
        target.shortcut_input(logical_from);
        return true;
    }
    connect_input(proc) {
        var l = _.where(this.ins, { from: proc});
        if (l.length) {
            throw new Error('connecting input from already-connected node');
        }
        // add proc as an upstream source, to keep track of fan-in.
        // override this for more elaborate input-state tracking.
        this.ins.push(this.build_input(proc));
    }
    shortcut_input(proc) {
        var l = _.where(this.ins, { from: proc});
        if (l.length === 0) {
            throw new Error('connecting shortcut but shortcut pair does not exist');
        }
    }
    build_input(proc) {
        // build an input state object for this input. override this
        // if you need fancier accounting.
        return {from: proc};
    }
    in_from(from) {
        // return input state object for this input node
        for (var i=0 ; i < this.ins.length ; i++) {
            if (this.ins[i].from === from) {
                return this.ins[i];
            }
        }
        throw new Error('unknown input');
    }
    teardown() {
    }
    //
    // upstream neighbors feed us points, marks, ticks, and eofs by
    // calling the appropriate consume* methods on their data.
    //
    consume(points, from) {
        this.stats.points_in += points.length;

        try {
            this.process(points);
        } catch (err) {
            this.trigger('error', err);
        }
    }
    consume_mark(time, from) {
        this.mark(time);
    }
    consume_tick(time, from) {
        this.tick(time);
    }
    consume_eof(from) {
        this.eof();
    }
    //
    // default proc behavior simply forwards points, marks, and eofs
    // to downstream neighbors. Extensions should override process(), mark(),
    // or eof() if they want something more than that.
    //
    process(points) {
        this.emit(points);
    }
    mark(time) {
        this.emit_mark(time);
    }
    tick(time) {
        this.emit_tick(time);
    }
    eof() {
        this.emit_eof();
    }
    //
    // propagate points/marks/eofs down the graph by invoking
    // our downstream neighbors' consume* methods.
    //
    emit(points, output_name) {
        if (!points.length) {
            return;
        }
        var k, out = this.out(output_name);
        for (k = 0; k < out.length; ++k) {
            // the array is copy on write so when
            // we send it downstream,
            // pts are immutable (by convention)
            // XXX we can enfoce this with "use strict" and freeze(),
            // but will it be hard to put the use stricts everywhere?
            out[k].proc.consume(points, out[k].from);
        }
        this.last_used_output = output_name || DEFAULT_OUT_NAME;
        this.stats.points_out += points.length;
    }
    emit_mark(time, output_name) {
        var k, out = this.out(output_name);
        for (k = 0; k < out.length; ++k) {
            out[k].proc.consume_mark(time, out[k].from);
        }
    }
    emit_tick(time, output_name) {
        var out = this.out(output_name);
        for (var k=0; k<out.length; ++k) {
            out[k].proc.consume_tick(time, out[k].from);
        }
    }
    emit_eof() {
        var k, out = this.out(this.last_used_output);
        for (k = 0; k < out.length; ++k) {
            out[k].proc.consume_eof(out[k].from);
        }
    }
    trigger(type, err) {
        if (err.info && _.isObject(err.info)) {
            if (! err.info.procName) {
                err.info.procName = this.procName();
            }

            if (! err.info.location) {
                err.info.location = this.location;
            }
        }
        this.program.events.emit(type, err.message, err);
    }
    locate_juttle_errors(block) {
        return errors.locate(block, this.location);
    }
    compile_error(code, info) {
        if (info === undefined) {
            info = {};
        }

        return errors.compileError(
            code,
            _.defaults(_.clone(info), { location: this.location })
        );
    }
    runtime_error(code, info) {
        if (info === undefined) {
            info = {};
        }

        return errors.runtimeError(
            code,
            _.defaults(_.clone(info), { location: this.location })
        );
    }
}

module.exports = base;

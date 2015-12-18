var _ = require('underscore');
var JuttleLogger = require('../../logger');
var Base = require('extendable-base');
var errors = require('../../errors');

var DEFAULT_OUT_NAME = 'default';

var base = Base.extend({
    //
    // called by the default constructor
    //
    initialize: function(options, params, pname, location, program) {
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
        this.pname = pname;
        this.location = location;
        this.program = program;
        this.stats = {points_in: 0, points_out: 0};
        this.last_used_output = DEFAULT_OUT_NAME;
        job_id = this.program.id ? '-' + this.program.id : '';
        this.logger_name = 'juttle-procs ' + this.procName + job_id;
        this.logger = JuttleLogger.getLogger(this.logger_name);
    },

    out: function(output_name) {
        output_name = output_name || DEFAULT_OUT_NAME;
        if (!this.out_.hasOwnProperty(output_name)) {
            this.out_[output_name] = [];
        }
        return this.out_[output_name];
    },
    out_names: function() {
        return Object.keys(this.out_);
    },
    //
    // called by gencode:JuttleEngine.activate during try_apply after
    // successful program compilation.
    //
    start: function() { },

    //
    // traverse the graph and call teardown once on every reachable proc
    // this would typically be called on the entry node
    //
    deactivate: function(mark) {
        if (this.visitMark !== mark) {
            this.visitMark = mark;
            _.each(this.out_, function(outputList) {
                _.each(outputList, function(output) {
                    output.proc.deactivate(mark);
                });
            });
            this.teardown();
        }
    },
    combine: function(proc) {
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
    },
    //XXX need a disconnect method
    connect: function(proc) {
        var out;
        if (this.isSink) {
            throw new Error ("connecting an output to a sink shouldn't happen!");
        }
        out = this.out();
        // add proc as a downstream consumer of our points.
        out.push({proc: proc, from: this});
        proc.connect_input(this);
        return true;
    },
    // Add a named shortcut link from this node to `target_proc`.
    // `name` can later be used by emit_xxx methods.
    // `logical_from_proc` is the proc that points sent over this
    // shortcut should appear to come from (for eof/mark fanin accounting purposes).
    shortcut: function(target, logical_from, name) {
        var out;
        if (this.isSink) {
            throw new Error ("connecting an output to a sink shouldn't happen!");
        }
        out = this.out(name);
        // add proc as a downstream consumer of our points.
        out.push({proc: target, from:logical_from});
        target.shortcut_input(logical_from);
        return true;
    },
    connect_input: function(proc) {
        var l = _.where(this.ins, { from: proc});
        if (l.length) {
            throw new Error("connecting input from already-connected node");
        }
        // add proc as an upstream source, to keep track of fan-in.
        // override this for more elaborate input-state tracking.
        this.ins.push(this.build_input(proc));
    },
    shortcut_input: function(proc) {
        var l = _.where(this.ins, { from: proc});
        if (l.length === 0) {
            throw new Error("connecting shortcut but shortcut pair does not exist");
        }
    },
    build_input: function(proc) {
        // build an input state object for this input. override this
        // if you need fancier accounting.
        return {from: proc};
    },
    in_from: function(from) {
        // return input state object for this input node
        for (var i=0 ; i < this.ins.length ; i++) {
            if (this.ins[i].from === from) {
                return this.ins[i];
            }
        }
        throw new Error("unknown input");
    },
    teardown: function() {
    },
    //
    // upstream neighbors feed us points, marks, ticks, and eofs by
    // calling the appropriate consume* methods on their data.
    //
    consume: function(points, from) {
        this.stats.points_in += points.length;

        try {
            this.process(points);
        } catch (err) {
            this.trigger('error', err);
        }
    },
    consume_mark: function(time, from) {
        this.mark(time);
    },
    consume_tick: function(time, from) {
        this.tick(time);
    },
    consume_eof: function(from) {
        this.eof();
    },
    //
    // default proc behavior simply forwards points, marks, and eofs
    // to downstream neighbors. Extensions should override process(), mark(),
    // or eof() if they want something more than that.
    //
    process: function(points) {
        this.emit(points);
    },
    mark: function(time) {
        this.emit_mark(time);
    },
    tick: function(time) {
        this.emit_tick(time);
    },
    eof: function() {
        this.emit_eof();
    },
    //
    // propagate points/marks/eofs down the graph by invoking
    // our downstream neighbors' consume* methods.
    //
    emit: function(points, output_name) {
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
    },
    emit_mark: function(time, output_name) {
        var k, out = this.out(output_name);
        for (k = 0; k < out.length; ++k) {
            out[k].proc.consume_mark(time, out[k].from);
        }
    },
    emit_tick: function(time, output_name) {
        var out = this.out(output_name);
        for (var k=0; k<out.length; ++k) {
            out[k].proc.consume_tick(time, out[k].from);
        }
    },
    emit_eof: function() {
        var k, out = this.out(this.last_used_output);
        for (k = 0; k < out.length; ++k) {
            out[k].proc.consume_eof(out[k].from);
        }
    },
    trigger: function(type, err) {
        if (err.info && _.isObject(err.info) && ! err.info.procName) {
            err.info.procName = this.procName;
        }
        this.program.trigger(type, err.message, err);
    },
    locate_juttle_errors: function(block) {
        return errors.locate(block, this.location);
    },
    compile_error: function(code, info) {
        if (info === undefined) {
            info = {};
        }

        return errors.compileError(
            code,
            _.defaults(_.clone(info), { location: this.location })
        );
    },
    runtime_error: function(code, info) {
        if (info === undefined) {
            info = {};
        }

        return errors.runtimeError(
            code,
            _.defaults(_.clone(info), { location: this.location })
        );
    }
});

module.exports = base;

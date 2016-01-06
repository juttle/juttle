
/* jshint evil:true */
var _ = require('underscore');
var Base = require('extendable-base');
var Promise = require('bluebird');

// the following variables are used in eval(), which jshint doesn't understand
// and complains about unused variables.
var JuttleMoment = require('./moment').JuttleMoment; // jshint ignore:line
var Filter = require('./runtime/filter'); // jshint ignore:line
var juttle = require('./runtime').runtime; // jshint ignore:line

var Juttle = require('./runtime').Juttle;
var errors = require('./errors');


var Program = Base.extend({
    initialize: function() {
        this.env = {};
    },
    set_env: function(env) {
        this.env = _.extend(this.env, env);
    },
    deactivate: function() {
        this.scheduler.stop();
        if (this.graph) {
            Juttle.teardown(this.graph);
            delete this.graph;
        }
    },
    _eval: function() {
        var o = eval(this.code);
        this.set_env({now: o.now});
        this.graph = o.graph;
        o.program.scheduler = this.scheduler;
    },
    // Returns a promise that is resolved when the program completes execution,
    // which is determined when all of the sinks have seen an eof.
    done: function() {
        return Promise.settle(_.map(this.get_sinks(), function(sink) {
            return sink.isDone;
        }));
    },
    activate: function() {
        var env = this.env;
        var events = this.events;
        _.each(this.get_nodes(), function(node) {
            _.extend(node.program, env, events);
        });

        _.each(this.get_nodes(), function(node) {
            node.start();
        });

        this.scheduler.start();
    },
    // connect a publish/subscribe channel that is inside the flowgraph closure to the
    // sink object (e.g., a view) that is outside the flowgraph
    // XXX actually this is a hack right now and relies on the Juttle global
    // table... publish/subscribe needs to be scoped in an intelligent way and the
    // Juttle namespace objects needs to be refactored into separate pieces
    // for proc/fn namespace and per-graph runtime state... better runtime
    // state should be its own class and should be created in main and
    // passed to all the procs etc created inside the closure
    bind_sink: function(sink, channel) {
        //XXX hack
        // this relies on there be different channel names for different
        // flowgraph running at the same time
        var sub = new Juttle.proc.subscribe({channel:channel}, {}, null, null, this);
        // sub will call emit which will call consume, which is part of
        // the sink API
        sub.connect(sink);
        this.graph.head[0].combine(sub);
    },
    _validate_sources: function() {
        var sources = this.get_sources();

        // Check that all heads are sources.
        for (var i = 0; i < this.graph.head.length; i++) {
            if (!(this.graph.head[i] instanceof Juttle.proc.source)) {
                throw errors.compileError('RT-PROC-CANNOT-START-FLOWGRAPH', {
                    proc: this.graph.head[i].procName,
                    location: this.graph.head[i].location
                });
            }
        }

        // Check that all sources occur at heads.
        var invalidSources = _(sources).difference(this.graph.head);

        if (invalidSources.length) {
            throw errors.compileError('RT-PROC-MUST-START-FLOWGRAPH', {
                proc: invalidSources[0].procName,
                location: invalidSources[0].location
            });
        }
    },

    _validate_sinks: function() {
        var sinks = this.get_sinks();
        var terminalNodes = this.get_terminal_nodes();

        // Check that all terminal nodes are valid sinks.
        for (var i = 0; i < terminalNodes.length; i++) {
            if (!terminalNodes[i].isSink) {
                throw errors.compileError('RT-PROC-CANNOT-END-FLOWGRAPH', {
                    proc: terminalNodes[i].procName,
                    location: terminalNodes[i].location
                });
            }
        }

        // Check that all sinks occur as terminal nodes.
        var invalidSinks = _(sinks).difference(terminalNodes);

        if (invalidSinks.length) {
            throw errors.compileError('RT-PROC-MUST-END-FLOWGRAPH', {
                proc: invalidSinks[0].procName,
                location: invalidSinks[0].location
            });
        }
    },

    get_sources: function() {
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (proc instanceof Juttle.proc.source);
        });
    },

    // returns a list of the views of this program, formatted for use by the app
    get_views: function() {
        var allSinks = this.get_sinks();
        return _.filter(allSinks, function(sink) {
            return sink.procName === 'view';
        })
        .map(function(view) {
            return {name: view.name, channel: view.channel, options: view.options, location: view.location};
        });
    },

    get_sinks: function() {
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (proc.isSink);
        });
    },

    get_terminal_nodes: function() {
        var self = this;
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (self._outputs(proc).length === 0);
        });
    },

    get_nodes: function() {
        return this._get_nodes_helper(this.graph.head, function(node) {
            return true;
        });
    },

    _outputs: function(proc) {
        var names = proc.out_names();
        var output_objs = _.flatten(_.map(names, function(name) { return proc.out(name);}));
        var output_procs = _.map(output_objs, function (p)  { return p.proc;});
        return output_procs;
    },
    // Returns nodes that pass the predicate function.
    _get_nodes_helper: function _get_nodes_helper(procs, predicate) {
        var nodes = [];
        var self = this;

        _(procs).each(function(proc) {
            var outputs = self._outputs(proc);
            if (predicate(proc)) {
                nodes.push(proc);
            }

            nodes = nodes.concat(self._get_nodes_helper(outputs, predicate));
        });

        return _(nodes).uniq();
    },
    get_stats: function(node) {
        if (!this.graph) {
            throw new Error('Cannot get stats before program compilation.');
        }

        var livenode = this._get_nodes_helper(this.graph.head, function(node_) {
            return node_.pname === node.pname;
        })[0];
        if (!livenode) {
            throw new Error('No such node: ' + node.pname);
        }

        return livenode.stats;
    }
});

module.exports = Program;

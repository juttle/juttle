'use strict';


var _ = require('underscore');
var Base = require('extendable-base');
var Promise = require('bluebird');

var juttle = require('./runtime').runtime;

var source = require('./runtime/procs/source');
var sink = require('./runtime/procs/sink');
var view = require('./runtime/procs/view');
var errors = require('./errors');


var Program = Base.extend({
    initialize: function() {
        this.env = {};
        this.visitGen = 0;
    },
    set_env: function(env) {
        this.env = _.extend(this.env, env);
    },
    deactivate: function() {
        var k;
        this.scheduler.stop();
        if (this.graph) {
            this.visitGen += 1;
            // loop over the head array to handle the case where
            // the onramp to the graph is a parallel path
            for (k = 0; k < this.graph.head.length; ++k) {
                this.graph.head[k].deactivate(this.visitGen);
            }
        }
    },
    _eval: function() {
        var o = eval(this.code)(juttle);
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
            _.extend(node.program, env, {events: events});
        });

        _.each(this.get_nodes(), function(node) {
            node.start();
        });

        this.scheduler.start();
    },
    _validate_sources: function() {
        var sources = this.get_sources();

        // Check that all heads are sources.
        for (var i = 0; i < this.graph.head.length; i++) {
            if (!(this.graph.head[i] instanceof source)) {
                throw errors.compileError('PROC-CANNOT-START-FLOWGRAPH', {
                    proc: this.graph.head[i].procName(),
                    location: this.graph.head[i].location
                });
            }
        }

        // Check that all sources occur at heads.
        var invalidSources = _(sources).difference(this.graph.head);

        if (invalidSources.length) {
            throw errors.compileError('PROC-MUST-START-FLOWGRAPH', {
                proc: invalidSources[0].procName(),
                location: invalidSources[0].location
            });
        }
    },

    _validate_sinks: function() {
        var sinks = this.get_sinks();
        var terminalNodes = this.get_terminal_nodes();

        // Check that all terminal nodes are valid sinks.
        for (var i = 0; i < terminalNodes.length; i++) {
            if (!(terminalNodes[i] instanceof sink)) {
                throw errors.compileError('PROC-CANNOT-END-FLOWGRAPH', {
                    proc: terminalNodes[i].procName(),
                    location: terminalNodes[i].location
                });
            }
        }

        // Check that all sinks occur as terminal nodes.
        var invalidSinks = _(sinks).difference(terminalNodes);

        if (invalidSinks.length) {
            throw errors.compileError('PROC-MUST-END-FLOWGRAPH', {
                proc: invalidSinks[0].procName(),
                location: invalidSinks[0].location
            });
        }
    },

    get_sources: function() {
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (proc instanceof source);
        });
    },

    // returns a list of the views of this program, formatted for use by the app
    get_views: function() {
        var allSinks = this.get_sinks();
        return _.filter(allSinks, function(sink) {
            return (sink instanceof view);
        })
        .map(function(view) {
            return {name: view.name, channel: view.channel, options: view.options, location: view.location};
        });
    },

    get_sinks: function() {
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (proc instanceof sink);
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
    }
});

module.exports = Program;

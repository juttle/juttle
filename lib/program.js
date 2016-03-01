'use strict';


var _ = require('underscore');
var Promise = require('bluebird');
var EventEmitter = require('eventemitter3');

var juttle = require('./runtime').runtime;

var source = require('./runtime/procs/source');
var sink = require('./runtime/procs/sink');
var view = require('./runtime/procs/view');
var errors = require('./errors');

class Program {
    constructor(code, options) {
        this.env = {};
        this.visitGen = 0;
        this.channels = 0;
        this.events = new EventEmitter();
        this.scheduler = options.scheduler;
        this.flowControl = options.flow_control;
        this.code = code;
        this.now = options.now;
        this.env.now = options.now;
    }
    deactivate() {
        var k;
        this.flowControl.stop();
        this.scheduler.stop();
        if (this.graph) {
            this.visitGen += 1;
            // loop over the head array to handle the case where
            // the onramp to the graph is a parallel path
            for (k = 0; k < this.graph.head.length; ++k) {
                this.graph.head[k].deactivate(this.visitGen);
            }
        }
    }
    eval() {
        this.graph = eval(this.code)(juttle, this).graph;
    }
    // Returns a promise that is resolved when the program completes execution,
    // which is determined when all of the sinks have seen an eof.
    done() {
        return Promise.settle(_.map(this.get_sinks(), function(sink) {
            return sink.isDone;
        }));
    }
    activate() {
        _.each(this.get_nodes(), function(node) {
            node.start();
        });

        this.flowControl.start();
        this.scheduler.start();
    }

    validate() {
        this._validate_sources();
        this._validate_sinks();
    }

    _validate_sources() {
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
    }

    _validate_sinks() {
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
    }

    get_sources() {
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (proc instanceof source);
        });
    }

    // returns a list of the views of this program, formatted for use by the app
    get_views() {
        var allSinks = this.get_sinks();
        return _.filter(allSinks, function(sink) {
            return (sink instanceof view);
        })
        .map(function(view) {
            return {name: view.name, channel: view.channel, options: view.options, location: view.location};
        });
    }

    get_sinks() {
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (proc instanceof sink);
        });
    }

    get_terminal_nodes() {
        var self = this;
        return this._get_nodes_helper(this.graph.head, function(proc) {
            return (self._outputs(proc).length === 0);
        });
    }

    get_nodes() {
        return this._get_nodes_helper(this.graph.head, function(node) {
            return true;
        });
    }

    _outputs(proc) {
        var names = proc.out_names();
        var output_objs = _.flatten(_.map(names, function(name) { return proc.out(name);}));
        var output_procs = _.map(output_objs, function (p)  { return p.proc;});
        return output_procs;
    }
    // Returns nodes that pass the predicate function.
    _get_nodes_helper(procs, predicate) {
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
}

module.exports = Program;

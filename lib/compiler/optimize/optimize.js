'use strict';

var _ = require('underscore');
var adapters = require('../../runtime/adapters');
var utils = require('./optimize_utils');
var optimize_head = require('./optimize_head');
var optimize_tail = require('./optimize_tail');
var optimize_reduce = require('./optimize_reduce');

function outs_are_unoptimizable(outs, graph) {
    if (outs.length !== 1) {
        return 'read_multiple_outputs';
    }

    function has_multiple_inputs(node) {
        return graph.node_get_inputs(node).length > 1;
    }

    if (_.any(outs, has_multiple_inputs)) {
        return 'next_node_multiple_inputs';
    }
}

function optimize_read(source_node, graph, Juttle) {
    var outs = graph.node_get_outputs(source_node);
    var unoptimizable_outs = outs_are_unoptimizable(outs, graph);
    if (unoptimizable_outs) {
        return utils.optimization_disabled(graph, source_node, unoptimizable_outs);
    }

    if (graph.node_get_option(source_node, 'optimize') === false) {
        utils.optimization_disabled(graph, source_node, 'unsupported_optimization');
        return false;
    }

    var optimization_info = {};

    var adapter = adapters.get(source_node.adapter.name, source_node.adapter.location);
    if (!adapter) {
        throw new Error('unknown adapter');
    }

    var successfully_optimized;
    var first_node = true;
    var next_node = outs[0];

    while (outs && !outs_are_unoptimizable(outs, graph)) {
        var reduce_every = false;
        switch (next_node.name) {
            case 'head':
                successfully_optimized = optimize_head(source_node, next_node, graph, adapter, optimization_info);
                break;

            case 'tail':
                successfully_optimized = optimize_tail(source_node, next_node, graph, adapter, optimization_info);
                break;

            case 'reduce':
                successfully_optimized = optimize_reduce(source_node, next_node, graph, adapter, optimization_info);
                reduce_every = graph.node_has_option(next_node, 'every');
                break;

            default:
                successfully_optimized = false;
                if (first_node) {
                    return utils.optimization_disabled(graph, source_node, 'not_optimizable');
                }
                break;
        }

        first_node = false;
        if (successfully_optimized) {
            outs = graph.node_get_outputs(next_node);
            var index = graph.index_of(next_node);
            var old_next_node = next_node;
            graph.remove_node(next_node);
            next_node = outs[0];
            if (reduce_every) {
                // Splice a batch node after an optimized read | reduce -every
                // so it'll emit marks like unoptimized reduce -every
                var batch = graph.insert_node('BuiltinProc', 'batch', index);
                graph.node_set_option(batch, 'every', graph.node_get_option(old_next_node, 'every'));
                if (graph.node_has_option(old_next_node, 'on')) {
                    graph.node_set_option(batch, 'on', graph.node_get_option(old_next_node, 'on'));
                }
                graph.add_edge(source_node, batch);
                graph.remove_edge(source_node, next_node);
                graph.add_edge(batch, next_node);
            }
        } else {
            break;
        }
    }

    utils.optimization_info(graph, source_node, optimization_info);
}

//
// The flowgraph processor that is the main entry point for optimization.
//
// For each read proc in the graph, there are various optimizations that can be
// performed depending on what the adapter supports and the specific program
// structure.
//
// To implement this support, traverse the flowgraph and check for the various
// patterns that are candidates for optimization. For each pattern, call into
// the adapter to determine whether that pattern is something the adapter can
// optimize, and if so, stash the relevant optimization info in the flowgraph so
// it will be passed to the read invocation.
//
function optimize(graph, Juttle) {
    var reads = _.where(graph.get_roots(), {type: 'ReadProc'});
    _.each(reads, function(node) {optimize_read(node, graph, Juttle);});
}

module.exports = optimize;

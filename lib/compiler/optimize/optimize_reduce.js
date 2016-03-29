'use strict';

function optimize_reduce(source, reduce, graph, adapter, optimization_info) {
    var next_hops = graph.node_get_outputs(reduce);
    if (next_hops.length === 0) {
        throw new Error('optimizer encountered reduce proc with no downstream node');
    }

    var has_reduce_every = graph.node_has_option(reduce, 'every');
    var has_read_every = graph.node_has_option(source, 'every');
    if (has_reduce_every && has_read_every) {
        throw new Error('cannot read -every | reduce -every');
    }

    var optimizer = adapter.optimizer;

    if (optimizer && typeof optimizer.optimize_reduce === 'function') {
        var successfully_optimized = optimizer.optimize_reduce(source, reduce, graph, optimization_info);
        if (successfully_optimized && has_reduce_every) {
            // stash the -every, this is used by read.js to quantize the time bounds
            // for live optimized reads
            optimization_info._reduce_every = graph.node_get_option(reduce, 'every');
        }

        return successfully_optimized;
    }
}

module.exports = optimize_reduce;

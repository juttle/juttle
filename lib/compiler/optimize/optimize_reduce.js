function optimize_reduce(source, reduce, graph, adapter, optimization_info) {
    var next_hops = graph.node_get_outputs(reduce);
    if (next_hops.length === 0) {
        throw new Error('optimizer encountered reduce proc with no downstream node');
    }

    var optimizer = adapter.optimizer;

    if (optimizer && typeof optimizer.optimize_reduce === 'function') {
        return optimizer.optimize_reduce(source, reduce, graph, optimization_info);
    }
}

module.exports = optimize_reduce;

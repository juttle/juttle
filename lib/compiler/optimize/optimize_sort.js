'use strict';

var utils = require('./optimize_utils');

var ALLOWED_OPTIONS = ['columns', 'limit', 'groupby'];

function optimize_sort(source, sort, graph, adapter, optimization_info) {
    if (! graph.node_contains_only_options(sort, ALLOWED_OPTIONS)) {
        utils.optimization_disabled(graph, source, 'unsupported_sort_option');
        return;
    }

    var optimizer = adapter.optimizer;
    
    if (optimizer && typeof optimizer.optimize_sort === 'function') {
        return optimizer.optimize_sort(source, sort, graph, optimization_info);
    }
}

module.exports = optimize_sort;

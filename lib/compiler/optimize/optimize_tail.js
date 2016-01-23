'use strict';

var utils = require('./optimize_utils');

var ALLOWED_OPTIONS_TAIL = ['arg'];

function optimize_tail(source, tail, graph, adapter, optimization_info) {
    if (! graph.node_contains_only_options(tail, ALLOWED_OPTIONS_TAIL)) {
        utils.optimization_disabled(graph, source, 'unsupported_tail_option');
        return;
    }

    var optimizer = adapter.optimizer;

    if (optimizer && typeof optimizer.optimize_tail === 'function') {
        return optimizer.optimize_tail(source, tail, graph, optimization_info);
    }
}

module.exports = optimize_tail;

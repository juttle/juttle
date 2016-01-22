'use strict';

var utils = require('./optimize_utils');

var ALLOWED_OPTIONS_HEAD = ['arg'];

function optimize_head(source, head, graph, adapter, optimization_info) {
    if (! graph.node_contains_only_options(head, ALLOWED_OPTIONS_HEAD)) {
        utils.optimization_disabled(graph, source, 'unsupported_head_option');
        return;
    }

    var optimizer = adapter.optimizer;

    if (optimizer && typeof optimizer.optimize_head === 'function') {
        return optimizer.optimize_head(source, head, graph, optimization_info);
    }
}

module.exports = optimize_head;

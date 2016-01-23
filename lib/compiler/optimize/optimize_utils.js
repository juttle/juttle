'use strict';

function optimization_disabled(graph, node, reason) {
    var info = {
        type: 'disabled',
        reason: reason
    };

    optimization_info(graph, node, info);
}

function optimization_info(g, node, info) {
    if (!g.node_get_param(node, 'optimization_info')) {
        g.node_set_param(node, 'optimization_info', info);
    }
}

module.exports = {
    optimization_disabled: optimization_disabled,
    optimization_info: optimization_info,
};

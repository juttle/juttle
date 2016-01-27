'use strict';

var optimizer = {
    optimize_head: function(read, head, graph, optimization_info) {
        var limit = graph.node_get_option(head, 'arg');

        if (optimization_info.hasOwnProperty('limit')) {
            limit = Math.min(limit, optimization_info.limit);
        }

        optimization_info.type = 'head';
        optimization_info.limit = limit;
        return true;
    }
};

module.exports = optimizer;


var _ = require('underscore');
var is_sink = require('../graph-builder').is_sink;

// Generate a graph builder that adds an implicit sink of the given type
// to any branches of the graph that don't already end in a sink.
function implicit_views(default_view) {
    default_view = default_view || "table";

    return function implicit_views(g) {
        var leaves = g.get_leaves();
        var table;
        _.each(leaves, function(node) {
            if (!is_sink(node)) {
                table = g.add_node('View', default_view);
                g.add_edge(node, table);
            }
        });
    };
}

module.exports = implicit_views;

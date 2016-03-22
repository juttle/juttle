'use strict';

var _ = require('underscore');


// Returns a list of all the source (`read` and `emit`) nodes that are upstream of the passed-in node.
function upstream_sources(g, node) {
    var flatMap = _.compose(_.flatten, _.map);
    function rec(node) {
        var inputs = g.node_get_inputs(node);
        var sources = _.filter(inputs, (node) => {
            return node.name === 'read' || node.name === 'emit';
        });
        var nonsources = _.difference(inputs, sources);
        return sources.concat(flatMap(nonsources, rec));
    }
    return _.uniq(rec(node));
}


function views_sourceinfo(g) {
    var views = _.where(g.get_leaves(), {type: 'View'});
    _.each(views, function(view) {
        var sources = upstream_sources(g, view);
        var time_bounds = _.map(sources, function(source) {
            return {from: g.node_get_option(source, 'from') || null,
                    to: g.node_get_option(source, 'to') || null,
                    last: g.node_get_option(source, 'last') || null};
        });
        g.node_set_option(view, '_jut_time_bounds', time_bounds);
    });
}

module.exports = views_sourceinfo;

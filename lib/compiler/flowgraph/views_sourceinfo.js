var _ = require('underscore');


// Returns a list of all the `read` nodes that are upstream of the passed-in node.
function upstream_reads(g, node) {
    var flatMap = _.compose(_.flatten, _.map);
    function rec(node) {
        var inputs = g.node_get_inputs(node);
        var reads = _.where(inputs, {type: 'ReadProc'});
        var nonreads = _.difference(inputs, reads);
        return reads.concat(flatMap(nonreads, rec));
    }
    return _.uniq(rec(node));
}


function views_sourceinfo(g) {
    var views = _.where(g.get_leaves(), {type: 'View'});
    _.each(views, function(view) {
        var reads = upstream_reads(g, view);
        var time_bounds = _.map(reads, function(read) {
            return {from: g.node_get_option(read, 'from') || null,
                    to: g.node_get_option(read, 'to') || null,
                    last: g.node_get_option(read, 'last') || null};
        });
        g.node_set_option(view, "_jut_time_bounds", time_bounds);
    });
}

module.exports = views_sourceinfo;

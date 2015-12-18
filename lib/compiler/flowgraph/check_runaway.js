var _ = require('underscore');
var errors = require('../../errors');



function is_runaway(read_node, g) {

    function node_type(node) {
        // temp while grammar refactor is in progress; once complete we should be
        // able to always look up .name
        return node.name || node.type;
    }

    function multiple_inputs(node) {
        return g.node_get_inputs(node).length > 1;
    }
    // historical read
    if (g.node_get_option(read_node, 'to') || g.node_get_option(read_node, 'last')) {
        return;
    }

    var outs;
    var next_node = read_node;
    while (true) {
        outs = g.node_get_outputs(next_node);

        // Keeping things simple for now and only considering linear topologies
        // (which means we won't flag all possible runaways)
        if (outs.length !== 1 || _.any(outs, multiple_inputs)) {
            return;
        }

        next_node = outs[0];

        switch (node_type(next_node)) {
            case 'batch':
                return;
            case 'tail':
                throw errors.compileError('JUTTLE-RUNAWAY-PROGRAM', {extra: "Add a -to option to read?"});
            case 'ReduceProc':
                if (!g.node_has_option(next_node, 'every')) {
                    throw errors.compileError('JUTTLE-RUNAWAY-PROGRAM', {extra: "Add a -to option to read or a -every option to reduce?"});
                }
                break;
            case 'ReduceProc':
                if (!g.node_has_option(next_node, 'every')) {
                    throw errors.compileError('JUTTLE-RUNAWAY-PROGRAM', {extra: "Add a -to option to read or a -every option to reduce?"});
                }
                break;
            case 'SortProc':
                throw errors.compileError('JUTTLE-RUNAWAY-PROGRAM', {extra: "Add a -to option to read?"});
            default:
                break;
        }
    }
}

function check_runaways(g) {
    var reads = _.where(g.get_roots(), {type: 'ReadProc', name: 'read'});
    _.each(reads, function(node) {is_runaway(node, g);});
}

module.exports = check_runaways;

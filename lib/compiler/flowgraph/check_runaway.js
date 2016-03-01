'use strict';

var _ = require('underscore');
var errors = require('../../errors');

function isRunaway(readNode, graph) {

    function nodeType(node) {
        // temp while grammar refactor is in progress; once complete we should be
        // able to always look up .name
        return node.name || node.type;
    }

    function multipleInputs(node) {
        return graph.node_get_inputs(node).length > 1;
    }
    // historical read
    if (graph.node_get_option(readNode, 'to') || graph.node_get_option(readNode, 'last')) {
        return;
    }

    var outs;
    var nextNode = readNode;
    while (true) {
        outs = graph.node_get_outputs(nextNode);

        // Keeping things simple for now and only considering linear topologies
        // (which means we won't flag all possible runaways)
        if (outs.length !== 1 || _.any(outs, multipleInputs)) {
            return;
        }

        nextNode = outs[0];

        switch (nodeType(nextNode)) {
            case 'batch':
                return;
            case 'tail':
                throw errors.compileError('RUNAWAY-PROGRAM', {
                    extra: 'Add a -to option to read?'
                });
            case 'ReduceProc':
                if (!graph.node_has_option(nextNode, 'every')) {
                    throw errors.compileError('RUNAWAY-PROGRAM', {
                        extra: 'Add a -to option to read or a -every option to reduce?'
                    });
                }
                break;
            case 'SortProc':
                throw errors.compileError('RUNAWAY-PROGRAM', {
                    extra: 'Add a -to option to read?'
                });
            default:
                break;
        }
    }
}

function checkRunaways(graph) {
    var reads = _.where(graph.get_roots(), {
        type: 'ReadProc',
        name: 'read'
    });

    _.each(reads, function(node) {isRunaway(node, graph);});
}

module.exports = checkRunaways;

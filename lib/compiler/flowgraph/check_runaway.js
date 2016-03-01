'use strict';

var _ = require('underscore');
var errors = require('../../errors');

function isRunaway(readNode, graph) {

    function multipleInputs(node) {
        return graph.node_get_inputs(node).length > 1;
    }

    // historical read is any read that doesn't have the `to` set to :end:
    var readNodeTo = graph.node_get_option(readNode, 'to');
    if (!readNodeTo ||
        // when the -to is set to something invalid then isEnd is not a function
        (readNodeTo.isEnd && !readNodeTo.isEnd())) {
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

        switch (nextNode.name) {
            case 'batch':
                return;
            case 'tail':
                throw errors.compileError('RUNAWAY-PROGRAM', {
                    extra: 'Add a -to option to read?'
                });
            case 'reduce':
                if (!graph.node_has_option(nextNode, 'every')) {
                    throw errors.compileError('RUNAWAY-PROGRAM', {
                        extra: 'Add a -to option to read or a -every option to reduce?'
                    });
                }
                break;
            case 'sort':
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

var _ = require('underscore');
var errors = require('../../errors');

function check_dropped(g) {
    var sources = _.where(g.get_roots(), {type: 'DroppedProc'});
    var outs;

    function multiple_inputs(node) {
        return g.node_get_inputs(node).length > 1;
    }

    _.each(sources, function(node) {
        while (true) {

            outs = g.node_get_outputs(node);
            if (outs.length === 0) {
                return;
            }

            if (outs.length > 1) {
                throw errors.compileError('JUTTLE-DROPPED-TOPO');
            }

            if (_.any(outs, multiple_inputs)) {
                throw errors.compileError('JUTTLE-DROPPED-TOPO');
            }
            node = outs[0];
        }
    });
}
module.exports = check_dropped;

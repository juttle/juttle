/* operators for PartialFilter. */

var partialOps = {
    land: function(partial_left, partial_right) {
        // during PartialFilter evaluation, resolve a boolean AND.
        // partial_left/right must result from visitPartialBoolean().
        if (partial_left !== undefined && partial_right !== undefined) {
            return (partial_left && partial_right);
        } else if (partial_left !== undefined && !partial_left) {
            return false;
        } else if (partial_right !== undefined && !partial_right) {
            return false;
        } else {
            partialOps.throw_unresolved();
        }
    },

    lor: function(partial_left, partial_right) {
        // during PartialFilter evaluation, resolve a boolean OR.
        // partial_left/right must result from visitPartialBoolean().
        if (partial_left !== undefined && partial_right !== undefined) {
            return (partial_left || partial_right);
        } else if (partial_left !== undefined && partial_left) {
            return true;
        } else if (partial_right !== undefined && partial_right) {
            return true;
        } else {
            partialOps.throw_unresolved();
        }
    },

    lnot: function(partial) {
        // during PartialFilter evaluation, resolve a boolean NOT.
        // partial must result from visitPartialBoolean().
        if (partial !== undefined) {
            return !partial;
        } else {
            partialOps.throw_unresolved();
        }
    },

    throw_unresolved: function() {
        // During PartialFilter evaluation, propagate an unresolved
        // result upwards until some operation catches and resolves it.
        throw {partial:true} ;
    }
};

module.exports = partialOps;

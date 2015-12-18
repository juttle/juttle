/**
 generate events whose rates and values are affected by latent demand.
*/
var _ =  require('underscore');

var _default_statusp = {
    // default probabilities of each http return code, should add to 1
    // These are selected such that at 100 requests/sec, there is
    // one 500 failure every 3 minutes.
    404: 0.01,
    500: 1 / (100 * 60 * 9),
    502: 1 / (100 * 60 * 9),
    503: 1 / (100 * 60 * 9),
    200: 1 - (0.01 + 1 / (100 * 60 * 3 ))
};

function statusp(demand, default_statusp) {
    default_statusp = default_statusp || _default_statusp;
    // return a probability map for return codes given demand 0..1
    if (demand < 0.50)  {
        return default_statusp;
    } else {
        var erate = (1 + 10 * (4 * demand * demand - 1)) / (100 * 60 * 3 );
        var p = {
            404: 0.01,
            500: erate / 3,
            502: erate / 3,
            503: erate / 3,
            200: 1 - (0.01 + erate),
        };
        return _.pick(p, _.keys(default_statusp)); // filter unconfigured codes
    }
}

module.exports = {
    statusp: statusp,
};


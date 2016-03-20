//
// Fake adapter used for testing that implements a synthetic 'timeseries'
// database.
//
// For any given read, the adapter generates one point per interval with a
// monotonically increasing value.
//
// This is used to test the pseudo-live periodic reading logic

'use strict';

var _ = require('underscore');
/* globals JuttleAdapterAPI */
var AdapterRead = JuttleAdapterAPI.AdapterRead;
var JuttleMoment = JuttleAdapterAPI.types.JuttleMoment;

class TestTimeseriesRead extends AdapterRead {
    constructor(options, params) {
        super(options, params);

        this.logger.debug('initialize options:', options);

        if (!options.from && !options.to) {
            throw this.compileError('MISSING-TIME-RANGE');
        }

        this.every = options.every || this.defaultTimeOptions().every;
        this.count = 0;
        this.time_ranges = []; // for tests
        if (params.optimization_info._reduce_every) {
            this.optimized_reduce_every = JuttleMoment.duration(params.optimization_info._reduce_every);
        }
    }

    periodicLiveRead() {
        return true;
    }

    defaultTimeOptions() {
        return _.extend(super.defaultTimeOptions(), {
            lag: JuttleMoment.duration(1, 's'),
            every: JuttleMoment.duration(0.5, 's')
        });
    }

    read(from, to, limit, state) {
        this.time_ranges.push({from: from, to: to});
        // Use the state to store the next timestamp to send.
        if (! state) {
            state = from.clone();
        }

        var points = [];
        while (points.length < limit) {
            if (state.gte(to)) {
                break;
            }

            points.push({
                time: state.clone(),
                count: this.count++
            });

            state = state.add(this.every);
        }

        if (this.optimized_reduce_every) {
            points = [{
                time: JuttleMoment.quantize(from, this.optimized_reduce_every),
                count: points.length
            }];
        }

        return Promise.resolve({
            points: points,
            readEnd: state.gte(to) ? to : null,
            state: state
        });
    }
}

var optimizer = {
    optimize_reduce: function(read, reduce, graph, optimization_info) {
        var reduce_is_count_every = reduce && reduce.reducers &&
            reduce.reducers.length === 1 && reduce.reducers[0].name === 'count' &&
            reduce.reducers[0].arguments.length === 0 && !reduce.groupby &&
            graph.node_has_option(reduce, 'every');

        if (reduce_is_count_every) {
            return true;
        }
    }
};

function TestTimeseriesAdapter() {
    return {
        name: 'testTimeseries',
        read: TestTimeseriesRead,
        optimizer: optimizer
    };
}

module.exports = TestTimeseriesAdapter;

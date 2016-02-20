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
        this.density = options.density || 1; // points per batch
        this.count = 0;
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

    static allowedOptions() { return super.commonOptions().concat(['density']); }

    read(from, to, limit, state) {
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

            state = state.add(this.every.divide(this.density));
        }

        return Promise.resolve({
            points: points,
            readEnd: state.gte(to) ? to : null,
            state: state
        });
    }
}

function TestTimeseriesAdapter() {
    return {
        name: 'testTimeseries',
        read: TestTimeseriesRead
    };
}

module.exports = TestTimeseriesAdapter;

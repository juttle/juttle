//
// Fake adapter used for testing that implements a synthetic 'timeseries'
// database.
//
// For any given read, the adapter generates one point per interval with a
// monotonically increasing value.
//
// This is used to test the pseudo-live periodic reading logic

'use strict';

var AdapterRead = require('../../lib/runtime/adapter-read');
var JuttleMoment = require('../../lib/runtime/types/juttle-moment');
var errors = require('../../lib/errors');

class TestTimeseriesRead extends AdapterRead {
    static get timeRequired() { return true; }

    constructor(options, params) {
        super(options, params);

        this.logger.debug('initialize options:', options);

        if (!options.from && !options.to) {
            throw errors.compileError('RT-MISSING-TIME-RANGE-ERROR');
        }

        this.every = options.every || JuttleMoment.duration(1, 's');
        this.count = 0;
    }

    periodicLiveRead() {
        return true;
    }

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

            state = state.add(this.every);
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

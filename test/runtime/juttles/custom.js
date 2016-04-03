'use strict';

/* global juttle */
let errors = juttle.errors;

class TrackerProc extends juttle.procs.fanin {
    procName() {
        return 'tracker';
    }

    constructor(options, params, location, program) {
        super(options, params, location, program);
        this.seen = 0;
    }

    consume(points) {
        this.seen += points.length;
        super.consume(points);
    }

    teardown() {
        this.trigger('warning', errors.runtimeError('INTERNAL-ERROR', {
            error: 'tracker saw ' + this.seen + ' points'
        }));
    }
}

module.exports = {
    procs: {
        tracker: TrackerProc
    }
};

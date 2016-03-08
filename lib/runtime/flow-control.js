/*
    Flow Control Scheduler Design

    The flow control module orchestrates the reading of points from sources and
    the emitting of points to sinks in order to try to balance performance and
    parallelism, while still limiting the amount of in-memory buffering that has
    to occur.

    To accomplish this, the scheduler synchronizes the time range that's being
    read from each source, potentially stalling faster sources in order for
    slower sources to catch up. All processing in the middle of the flowgraph
    occurs without interactions with the scheduler. To handle the case where a
    source is faster than a sink, each sink is responsible for tracking the
    amount of outstanding data it has buffered. If it exceeds a threshold, then
    the sink signals the flow control scheduler to stop reading from all sources
    and restarts things once the sink drainks.

    The scheduler has two main components -- a Reader and an Emitter. They
    communicate using a set of shared queues, one for each source in the
    program.

    The Reader is responsible for scheduling interactions with the sources
    themselves to fetch points and fill the queues. For each source it tries to
    fill the queue with successive calls to read some points. If a queue fills
    up, it stops reading from that source until the Emitter drains points. Once
    the source catches up to real time, it also keeps track of gaps in the
    points in order to send ticks.

    The Emitter is responsible for coordinating the draining of queues and
    sending points / ticks down the flowgraph. It loops over all the sources. If
    any of the queues are empty, it waits until that source reads some points or
    updates the record to indicate a gap in the points. Once all of the queues
    have some points in them, it finds the one with the smallest timestamp and
    emits a burst of points from that source and continues to loop over them
    sending points from the one with points earliest in time. Any time the
    Emitter skips a queue because its earliest timestamp is not the earliest
    one, then it sends a tick from that source to unblock a downstream merge or
    join point in the flowgraph. Once a source is at eof and its queue is empty,
    it is removed from consideration.

    Any time a sink has more outstanding points than a given threshold, it can
    signal the Emitter to pause, at which point it stops sending from any
    source. The sink is responsible for resuming the Emitter once enough points
    have been drained.

*/

'use strict';


var _ = require('underscore');
var JuttleLogger = require('../logger');
var JuttleMoment = require('./types/juttle-moment');

class FlowControl {
    constructor(options) {
        options = options || {};
        this.procs = {};
        this.timer = null;

        this.emitInterval = options.emitInterval || 200;
        this.emitBatchSize = options.emitBatchSize || 10000;

        this.logger_name = 'flow-control';
        this.logger = JuttleLogger.getLogger(this.logger_name);
    }

    start() {
        this.logger.debug('started');
        this.timer = setInterval(this.emit.bind(this), this.emitInterval);
    }

    stop() {
        clearInterval(this.timer);
        this.logger.debug('stopped');
    }

    register(proc) {
        var pname = proc.params.pname;
        if (!this.procs[pname]) { this.procs[pname] = proc; }
    }

    emit(options) {
        var options = options || {};
        this.emitTicks(options);
        this.emitPoints(options);
    }

    emitTicks(options) {
        _.each(this.procs, (proc, pname) => {
            // care about live mode only, for now
            if (!proc.adapter || !proc.adapter.periodicLiveRead()) { return; }

            var now = new JuttleMoment();
            if (now.gt(proc.nextTick)) {
                proc.emit_tick(proc.nextTick);
                proc.nextTick = proc.nextTick.add(proc.tickEvery);
            }
        });
    }

    emitPoints(options) {
        _.each(this.procs, (proc, pname) => {
            var batchSize = this.getBatchSize(proc, options);
            var points = proc.queue.splice(0, batchSize);

            if (points.length > 0) {
                this.logger.debug(`${pname} emits ${points.length} points`);
                proc.emit(points);

                var lastPt = points[points.length - 1];
                if (lastPt.time) {
                    proc.lastEmit = lastPt.time;
                }
            }
        });
    }

    getBatchSize(proc, options) {
        return options.emitAll ? proc.queue.length : this.emitBatchSize;
    }
}

module.exports = FlowControl;

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

    emit() {
        this.emitTicks();
        this.emitPoints();
    }

    emitTicks() {
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

    emitPoints() {
        _.each(this.procs, (proc, pname) => {
            var points = proc.queue.splice(0);

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
}

module.exports = FlowControl;

'use strict';

var _ = require('underscore');

class FlowControl {
    constructor(options) {
        options = options || {};
        this.procs = {};
        this.timer = null;
        this.emitInterval = options.emitInterval || 200;
    }

    start() {
        this.timer = setInterval(this.emit.bind(this), this.emitInterval);
    }

    stop() {
        clearInterval(this.timer);
    }

    register(proc) {
        var pname = proc.params.pname;
        if (!this.procs[pname]) { this.procs[pname] = proc; }
    }

    emit() {
        _.each(this.procs, (proc, pname) => {
            proc.emit(proc.queue.splice(0));
        });
    }
}

module.exports = FlowControl;

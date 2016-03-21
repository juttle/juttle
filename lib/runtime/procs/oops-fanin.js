'use strict';

var fanin = require('./fanin');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var errors = require('../errors');

class oops_fanin extends fanin {
    // watch for out-of-order points and points with non-moment times when emitting
    constructor(options, params, location, program) {
        super(options, params, location, program);
        if (params && params.assigned_fields && params.assigned_fields.indexOf('time') >= 0) {
            this.watch_oops = true; // true enables out-of-order checks during emit
            this.last_output_time = JuttleMoment.epsMoment(-Infinity); // only updated if watch_oops
        } else {
            this.watch_oops = false;
        }
    }
    warn_oops(badTime, goodTime) {
        this.trigger('warning', this.runtime_error('TIME-OUT-OF-ORDER', {
            badTime:badTime.valueOf(),
            goodTime:goodTime.valueOf()
        }));
    }
    warn_time(time) {
        this.trigger('warning', errors.typeErrorTime(time));
    }
    emit(points, output_name) {
        if (this.watch_oops) {
            var i = 0;
            while (i < points.length) {
                var time = points[i].time;
                if (time) {
                    if (!time.moment) {
                        this.warn_time(time);
                        points.splice(i, 1); // drop that point!
                        continue;
                    } else if (time.lt(this.last_output_time)) {
                        this.warn_oops(time, this.last_output_time);
                        points.splice(i, 1); // drop that point!
                        continue;
                    } else {
                        this.last_output_time = time;
                    }
                }
                i += 1;
            }
        }
        fanin.prototype.emit.call(this, points, output_name);
    }
    emit_mark(mark, output_name) {
        if (this.watch_oops) {
            if (mark.time.lt(this.last_output_time)) {
                this.warn_oops(mark.time, this.last_output_time);
                return;
            } else {
                this.last_output_time = mark.time;
            }
        }
        fanin.prototype.emit_mark.call(this, mark, output_name);
    }
    emit_tick(time, output_name) {
        if (this.watch_oops) {
            // when rewriting time, we don't have a rule for rewriting ticks.
            // to maintain order. setting them to last output is at least valid.
            time = this.last_output_time;
        }
        fanin.prototype.emit_tick.call(this, time, output_name);
    }
}

module.exports = oops_fanin;

'use strict';

var fanin = require('./fanin');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var errors = require('../errors');

var oops_funcs = {
    // watch for out-of-order points and points with non-moment times when emitting
    initialize: function(options, params) {
        if (params.lhs.indexOf('time') >= 0) {
            this.watch_oops = true; // true enables out-of-order checks during emit
            this.last_output_time = JuttleMoment.epsMoment(-Infinity); // only updated if watch_oops
        } else {
            this.watch_oops = false;
        }
    },
    warn_oops: function(badTime, goodTime) {
        this.trigger('warning', this.runtime_error('RT-TIME-OUT-OF-ORDER', {
            badTime:badTime.valueOf(),
            goodTime:goodTime.valueOf()
        }));
    },
    emit: function(points, output_name) {
        if (this.watch_oops) {
            var i = 0;
            while (i < points.length) {
                var time = points[i].time;
                if (time) {
                    if (!time.moment) {
                        throw errors.typeErrorTime(time);
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
    },
    emit_mark: function(time, output_name) {
        if (this.watch_oops) {
            if (time.lt(this.last_output_time)) {
                this.warn_oops();
                return;
            } else {
                this.last_output_time = time;
            }
        }
        fanin.prototype.emit_mark.call(this, time, output_name);
    },
    emit_tick: function(time, output_name) {
        if (this.watch_oops) {
            // when rewriting time, we don't have a rule for rewriting ticks.
            // to maintain order. setting them to last output is at least valid.
            time = this.last_output_time;
        }
        fanin.prototype.emit_tick.call(this, time, output_name);
    }
};

module.exports = oops_funcs;

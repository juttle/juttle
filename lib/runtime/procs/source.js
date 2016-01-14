//
// base class for all sources
//

var juttle_utils = require('../juttle-utils');
var JuttleMoment = require('../../moment').JuttleMoment;
var values = require('../values');

var base = require('./base');

var INFO = {
    type: 'source',
    options: {}
};

var source = base.extend({
    // Assigns the time from timeField to 'time' and attempts to convert it
    // into JuttleMoment
    //
    // If not specified, timeField defaults to 'time'. If specified and point
    // is missing that field, emits a warning.
    parseTime: function(points, timeField, timeUnit) {
        var self = this;

        points.forEach(function(pt) {
            if (timeField && !pt[timeField]) {
                self.trigger('warning', self.runtime_error('RT-POINT-MISSING-TIME', {field: timeField}));
            }

            var time = pt[timeField || 'time'];
            if (values.isNumber(time)) {
                time = JuttleMoment.duration(time, timeUnit).milliseconds();
            }

            if (time || time === 0) { pt.time = time; }
        });

        return juttle_utils.toNative(points);
    }
}, {
    info: INFO
});

module.exports = source;

//
// base class for all sources
//

var juttle_utils = require('../juttle-utils');
var _ = require('underscore');

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
    parseTime: function(points, timeField) {
        var self = this;

        _.each(points, function(pt) {
            if (timeField && !pt[timeField]) {
                self.trigger('warning', self.runtime_error('RT-POINT-MISSING-TIME', {field: timeField}));
            }

            var time = pt[timeField || 'time'];
            if (time) { pt.time = time; }
        });

        juttle_utils.toNative(points);

        return points;
    }
}, {
    info: INFO
});

module.exports = source;

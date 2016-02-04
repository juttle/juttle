'use strict';

var _ = require('underscore');
var fanin = require('./fanin');
var values = require('../values');
var Groups = require('../groups');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

/* like unix uniq command:
   Emits each data point that differs from the one
   that came before it. Swallows other points. */
var uniq = fanin.extend({
    initialize: function(options, params, location, program) {
        this.fields = options.arg || [];
        this.groups = new Groups(this, options);
    },
    procName: function() {
        return 'uniq';
    },
    process: function(points) {
        var toEmit = [];

        for (var i = 0; i < points.length; i++) {
            var pt = points[i];

            var row = this.groups.lookup(pt);
            var fields = (this.fields.length) ? this.fields : _.keys(_.omit(pt, 'time'));

            if (!row.stored) {
                row.stored = pt;
                toEmit.push(pt);
                continue;
            }

            for (var j = 0; j < fields.length; j++) {
                var field = fields[j];

                var inStored = _.has(row.stored, field);
                var inPoint = _.has(pt, field);

                // Nothing to compare
                if (!inStored && !inPoint) { continue; }

                // Emit also if the field doesn't exist in either of the points.
                if (inStored !== inPoint || !values.equal(row.stored[field], pt[field])) {
                    row.stored = pt;
                    toEmit.push(pt);
                    break;
                }
            }
        }

        if (toEmit.length > 0) {
            this.emit(toEmit);
        }
    },
    mark: function(time, from) {
        this.groups.reset();
        this.emit_mark(time);
    },
    eof: function() {
        this.emit_eof();
    }
}, {
    info: INFO
});

module.exports = uniq;

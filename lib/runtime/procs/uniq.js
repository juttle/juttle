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
    initialize: function(options) {
        this.columns = options.arg || [];
        this.groups = new Groups(this, options);
    },
    procName:  'uniq',
    process: function(points) {
        var toEmit = [];

        for (var i = 0; i < points.length; i++) {
            var pt = points[i];

            var row = this.groups.lookup(pt);
            var cols = (this.columns.length) ? this.columns : _.keys(_.omit(pt, 'time'));

            if (!row.stored) {
                row.stored = pt;
                toEmit.push(pt);
                continue;
            }

            for (var j = 0; j < cols.length; j++) {
                var col = cols[j];

                if (!values.equal(row.stored[col], pt[col])) {
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

var _ = require('underscore');
var JuttleMoment = require('../../moment').JuttleMoment;
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
        var k, m, fld, cols, row, pt;
        var toEmit = [];
        for (k = 0; k < points.length; ++k) {
            pt = points[k];
            row = this.groups.lookup(pt);
            if (!row.stored) {
                row.stored = pt;
                toEmit.push(pt);
                continue;
            }

            cols = (this.columns.length) ? this.columns : _.keys(_.omit(pt, 'time'));
            for (m = 0; m < cols.length; ++m) {
                fld = cols[m];

                if (!values.equal(row.stored[fld], pt[fld])) {
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

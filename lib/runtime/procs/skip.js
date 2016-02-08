'use strict';

var _ = require('underscore');
var utils = require('../juttle-utils');
var fanin = require('./fanin');
var Groups = require('../groups');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

var skip = fanin.extend({
    initialize: function(options) {
        if (options.arg && !utils.isInteger(options.arg)) {
            throw this.compile_error('RT-INTEGER-REQUIRED-ERROR', {
                proc: 'skip',
                argument: 'argument'
            });
        }
        this.n = options.arg;
        this.groups = new Groups(this, options);
    },
    procName: function() {
        return 'skip';
    },
    process: function(points) {
        var k, row;
        for (k = 0; k < points.length; ++k) {
            row = this.groups.lookup(points[k]);
            if (!_.has(row, 'skipped')) {
                row.skipped = 0;
            }
            if (row.skipped < this.n) {
                row.skipped++;
            } else {
                this.emit([points[k]]);
            }
        }
    },
    mark: function(time, from) {
        // process and publish each mark
        this.groups.reset();
        this.emit_mark(time);
    },
    eof: function(from) {
        this.groups.reset();
        this.emit_eof();
    }
}, {
    info: INFO
});

module.exports = skip;

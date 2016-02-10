'use strict';

var _ = require('underscore');
var utils = require('../juttle-utils');
var fanin = require('./fanin');
var Groups = require('../groups');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

class skip extends fanin {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        if (options.arg && !utils.isInteger(options.arg)) {
            throw this.compile_error('INTEGER-REQUIRED', {
                proc: 'skip',
                argument: 'argument'
            });
        }
        this.n = options.arg;
        this.groups = new Groups(this, options);
    }
    procName() {
        return 'skip';
    }
    process(points) {
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
    }
    mark(time, from) {
        // process and publish each mark
        this.groups.reset();
        this.emit_mark(time);
    }
    eof(from) {
        this.groups.reset();
        this.emit_eof();
    }

    static get info() {
        return INFO;
    }
}

module.exports = skip;

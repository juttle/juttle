'use strict';

var _ = require('underscore');
var utils = require('../juttle-utils');
var fanin = require('./fanin');
var DEQueue = require('double-ended-queue');
var Groups = require('../groups');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

class tail extends fanin {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        if (options.arg && !utils.isInteger(options.arg)) {
            throw this.compile_error('INTEGER-REQUIRED', {
                proc: 'tail',
                argument: 'limit'
            });
        }
        this.limit = options.arg;
        this.groups = new Groups(this, options);
    }
    procName() {
        return 'tail';
    }
    process(points) {
        var k, row;
        for (k = 0; k < points.length; ++k) {
            row = this.groups.lookup(points[k]);
            if (!row.pts) {
                row.pts = new DEQueue();
            }
            row.pts.push(points[k]);
            while (row.pts.length > this.limit) {
                row.pts.shift();
            }
        }
    }
    _run() {
        this.emit_ordered_points();
        this.groups.reset();
    }
    mark(mark, from) {
        // process and publish each mark
        this._run();
        this.emit_mark(mark);
    }
    eof(from) {
        this._run();
        this.emit_eof();
    }

    emit_ordered_points() {
        var points = _(this.groups.table)
            .chain()
            .map(function(row) {
                return row.pts.toArray();
            })
            .flatten()
            .value();

        var timefulIndexes = [];
        var timelessIndexes = [];
        var sorted = _.sortBy(points, function(pt, index) {
            if (pt.hasOwnProperty('time')) {
                timefulIndexes.push(index);
                return pt.time.milliseconds();
            } else {
                timelessIndexes.push(index);
                return Infinity;
            }
        });

        var finalPoints = {};
        _.each(timefulIndexes, function(index, i) {
            finalPoints[index] = sorted[i];
        });

        _.each(timelessIndexes, function(index, i) {
            finalPoints[index] = sorted[i + timefulIndexes.length];
        });

        this.emit(_.toArray(finalPoints));
    }

    static get info() {
        return INFO;
    }
}

module.exports = tail;

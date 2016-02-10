'use strict';

var _ = require('underscore');
var fanin = require('./fanin');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

class remove extends fanin {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        this.columns = options.columns || [];
    }
    procName() {
        return 'remove';
    }
    process(points) {
        var pt, k, m, fld;
        var cols = this.columns;
        var out = [];
        for (k = 0; k < points.length; ++k) {
            pt = _.clone(points[k]);
            for (m = 0; m < cols.length; ++m) {
                fld = cols[m];
                delete pt[fld];
            }
            out.push(pt);
        }
        this.emit(out);
    }

    static get info() {
        return INFO;
    }
}

module.exports = remove;

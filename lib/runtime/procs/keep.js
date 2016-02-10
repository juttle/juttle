'use strict';

var fanin = require('./fanin');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

class keep extends fanin {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        this.columns = options.columns || [];
    }
    procName() {
        return 'keep';
    }
    process(points) {
        var pt, k, m, fld;
        var cols = this.columns;
        var out = [];
        for (k = 0; k < points.length; ++k) {
            pt = {};
            for (m = 0; m < cols.length; ++m) {
                // copy fields to keep from input pt to output
                // if field doesn't exist in the input point,
                // then a field is created with an undefined value
                fld = cols[m];
                if (points[k].hasOwnProperty(fld)) {
                    pt[fld] = points[k][fld];
                }
            }
            out.push(pt);
        }
        this.emit(out);
    }

    static get info() {
        return INFO;
    }
}


module.exports = keep;

'use strict';

var fanin = require('./fanin');
var errors = require('../../errors');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

var filter = fanin.extend({
    initialize: function(options, params) {
        this.predicate = params.predicate;
    },
    procName: function() {
        return 'filter';
    },
    process: function(points) {
        var k = 0;
        var out = [];
        var fn = this.predicate;
        for (k = 0; k < points.length; ++k) {
            var pt = points[k];
            var passed;

            try {
                passed = this.locate_juttle_errors(function() {
                    return fn(pt);
                });
            } catch (e) {
                if (e instanceof errors.RuntimeError) {
                    this.trigger('warning', e);
                    passed = false;
                } else {
                    throw e;
                }
            }

            if (passed) {
                out.push(pt);
            }
        }
        this.emit(out);
    }
}, {
    info: INFO
});

module.exports = filter;

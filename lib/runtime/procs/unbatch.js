'use strict';

var fanin = require('./fanin');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

// unbatch, simply forwards everything except marks
var unbatch = fanin.extend({
    procName: function() {
        return 'unbatch';
    },
    process: function(points) {
        this.emit(points);
    },
    mark: function(time) { },
    tick: function(time) {
        this.emit_tick(time);
    },
    eof: function() {
        this.emit_eof();
    }
}, {
    info: INFO
});



module.exports = unbatch;

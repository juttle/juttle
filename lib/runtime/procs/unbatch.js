'use strict';

var fanin = require('./fanin');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

// unbatch, simply forwards everything except marks
class unbatch extends fanin {
    procName() {
        return 'unbatch';
    }
    process(points) {
        this.emit(points);
    }
    mark(time) { }
    tick(time) {
        this.emit_tick(time);
    }
    eof() {
        this.emit_eof();
    }

    static get info() {
        return INFO;
    }
}



module.exports = unbatch;

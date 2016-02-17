'use strict';

var fanin = require('./fanin');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

class pass extends fanin {
    procName() {
        return 'pass';
    }

    static get info() {
        return INFO;
    }
}

module.exports = pass;

'use strict';

var fanin = require('./fanin');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

var pass = fanin.extend({
    procName: function() {
        return 'pass';
    }
}, {
    info: INFO
});

module.exports = pass;

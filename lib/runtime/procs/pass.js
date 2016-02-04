'use strict';

var fanin = require('./fanin');

var INFO = {
    type: 'proc',
    options: {}   // documented, non-deprecated options only
};

var pass = fanin.extend({
}, {
    info: INFO
});

module.exports = pass;

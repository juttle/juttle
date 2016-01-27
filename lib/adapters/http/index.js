'use strict';

function HTTPAdapter(config, Juttle) {
    return {
        name: 'http',
        read: require('./read'),
        write: require('./write'),
        optimizer: require('./optimize')
    };
}

module.exports = HTTPAdapter;

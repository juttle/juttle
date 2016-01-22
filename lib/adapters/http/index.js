'use strict';

function HTTPAdapter(config, Juttle) {
    return {
        name: 'http',
        read: require('./read'),
        write: require('./write')
    };
}

module.exports = HTTPAdapter;

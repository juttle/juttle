'use strict';

module.exports = function(config, Juttle) {
    return {
        name: 'shell',
        read: require('./read'),
        write: require('./write'),
        optimizer: require('./optimize')
    };
};

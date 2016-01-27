'use strict';

module.exports = function(config, Juttle) {
    return {
        name: 'stdio',
        read: require('./read'),
        write: require('./write'),
        optimizer: require('./optimize')
    };
};

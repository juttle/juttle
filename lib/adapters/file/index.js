'use strict';

//
// Simple Juttle adapter that implements a single file "database".
//
// The "file" option indicates a file to read/write from and it must contain
// a JSON array of objects.
//
// The filters passed in the read parameterrs are executed to filter the points
// from the file.

function FileAdapter(config, Juttle) {
    return {
        name: 'file',
        read: require('./read'),
        write: require('./write'),
        optimizer: require('./optimize')
    };
}

module.exports = FileAdapter;

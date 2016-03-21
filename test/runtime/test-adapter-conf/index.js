//
// Fake adapter used for testing configuration.
//
'use strict';

/* globals JuttleAdapterAPI */
var AdapterRead = JuttleAdapterAPI.AdapterRead;

function TestAdapter(config) {
    
    class Read extends AdapterRead {
        constructor(options, params) {
            super(options, params);
        }

        read(from, to, limit, state) {
            return Promise.resolve({
                points: config,
                eof: true
            });
        }
    }

    return {
        name: config.host || config[0].host,
        read: Read
    };
}

module.exports = TestAdapter;

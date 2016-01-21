'use strict';
var EventEmitter = require('eventemitter3');
var JuttleLogger = require('../logger');

//
// Base class for all adapter `write` implementations.
//
class AdapterWrite {
    // Construct the adapter write module.
    //
    // The options and params from the original proc are stashed as fields so
    // the adapter can do its own validation after the fact.
    constructor(options, params) {
        this.options = options;
        this.params = params;
        this.logger = JuttleLogger.getLogger(params.logger_name);
        this.events = new EventEmitter();
    }

    // Trigger the given event
    trigger(type, event) {
        this.events.emit(type, event);
    }

    // Subscribe to the given event types
    on(type, handler, context) {
        this.events.on(type, handler, context);
    }

    // Write out the given points.
    //
    // Typically this will be asynchronous, and the adapter is responsible for
    // tracking any outstanding writes. Once eof() is called, all the
    // outstanding writes should be completed before eof resolves.
    write() {
        throw new Error('write must be implemented');
    }

    // Signal that the stream is done.
    //
    // Returns a promise once the adapter has completed writing all the data and
    // the flowgraph can be shut down.
    eof() {
        throw new Error('write must be implemented');
    }
}

module.exports = AdapterWrite;

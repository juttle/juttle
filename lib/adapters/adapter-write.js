'use strict';
var EventEmitter = require('eventemitter3');
var JuttleLogger = require('../logger');
var errors = require('../errors');

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

    // Helper function to return a new compilation error. Currently this just
    // creates the error class directly, but in the future this will allow
    // custom error codes for each adapter.
    compileError(code, info) {
        return errors.compileError(code, info);
    }

    // Helper function to return a new runtime error. Currently this just
    // creates the error class directly, but in the future this will allow
    // custom error codes for each adapter.
    runtimeError(code, info) {
        return errors.runtimeError(code, info);
    }

    // Indication the program has started for the adapter to do any
    // initialization of the output.
    start() {
    }

    // Write out the given points.
    //
    // Typically this will be asynchronous, and the adapter is responsible for
    // tracking any outstanding writes. Once eof() is called, all the
    // outstanding writes should be completed before eof resolves.
    write() {
        throw new Error('write must be implemented');
    }

    // Acknowledge that a number of points were written.
    //
    // This is required for flow control and should be called with the number of
    // points equal to the count that was passed to write.
    wrote(count) {
        this.trigger('wrote', count);
    }

    // subclasses override this method to return an array
    // we'll check that all options passed to the
    // proc are in the array
    static allowedOptions() { return []; }

    // subclasses override this method to return an array
    // if they do we'll check that all options in the array
    // are passed to the proc
    static requiredOptions() { return []; }

    // Signal that the stream is done.
    //
    // Returns a value or a promise once the adapter has completed writing all
    // the data and the flowgraph can be shut down.
    eof() {
        throw new Error('eof must be implemented');
    }
}

module.exports = AdapterWrite;

'use strict';
var EventEmitter = require('eventemitter3');
var JuttleLogger = require('../logger');
var juttle_utils = require('./juttle-utils');

//
// Base class for all adapter `read` implementations.
//
class AdapterRead {
    // Construct the adapter read module.
    //
    // The options and params from the original proc are stashed as fields so
    // the adapter can do its own validation after the fact.
    constructor(options, params) {
        this.options = options;
        this.params = params;
        this.logger = JuttleLogger.getLogger(params.logger_name);
        this.events = new EventEmitter();
    }

    // Assigns the time from timeField to 'time' and attempts to convert it
    // into JuttleMoment.
    parseTime(points, timeField) {
        return juttle_utils.parseTime(points, timeField, this);
    }

    // Trigger the given event
    trigger(type, event) {
        this.events.emit(type, event);
    }

    // Subscribe to the given event types
    on(type, handler, context) {
        this.events.on(type, handler, context);
    }

    // Hook to indicate that the read has been started
    start() {
    }

    // Core API to read up to `limit` points between the specified time
    // intervals.
    //
    // Returns a promise that resolves with an object containing:
    //   points: the points that are ready to emit in the flowgraph
    //   done: true if all points between [from..to) were produced
    //   state: optional continuation state for paging
    //
    // The state returned from one call to read will be passed into a subsequent
    // call when fetching the points.
    read(from, to, limit, state) {
        throw new Error('read must be implemented');
    }
}

module.exports = AdapterRead;

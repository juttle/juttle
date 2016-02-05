'use strict';

var Base = require('extendable-base');
var EventEmitter = require('eventemitter3');

var SerializerBase = Base.inherits(EventEmitter, {
    /*
     * A serializer can override the following methods in order to provide the
     * desired serialization method and should fire errors by using the
     * `this.emit('error', ...)` EvenEmitter method.
     */
    initialize: function(stream, options) {
        this.stream = stream;
    },

    write: function(points) {
        // implement me
    },

    done: function() {
        // implement me
        // this method should return a promise that resolves when the
        // serializer is done flushing the data to the unerlying stream
    }
});

module.exports = SerializerBase;

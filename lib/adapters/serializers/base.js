'use strict';

var EventEmitter = require('eventemitter3');

class SerializerBase extends EventEmitter {
    /*
     * A serializer can override the following methods in order to provide the
     * desired serialization method and should fire errors by using the
     * `this.emit('error', ...)` EvenEmitter method.
     */
    constructor(stream, options) {
        super(stream, options);
        this.stream = stream;
    }

    write(points) {
        // implement me
    }

    done() {
        // implement me
        // this method should return a promise that resolves when the
        // serializer is done flushing the data to the unerlying stream
    }
}

module.exports = SerializerBase;

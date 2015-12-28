var Base = require('extendable-base');
var events = require('events');

module.exports = Base.inherits(events.EventEmitter, {
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

    done: function(points) {
        // implement me
    }
});

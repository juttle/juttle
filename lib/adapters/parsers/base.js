var Base = require('extendable-base');
var events = require('events');

module.exports = Base.inherits(events.EventEmitter, {
    /*
     * A parser must implement the parseStream function below and should fire
     * errors by using the
     * `this.emit('error', ...)` EvenEmitter method.
     */
    initialize: function(options) {
        this.limit = (options && options.limit) ? options.limit : 1024;
    },

    parseStream: function(stream, emit) {
        throw new Error('parseStream must be implemented');
    }
});

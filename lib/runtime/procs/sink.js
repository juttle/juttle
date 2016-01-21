var fanin = require('./fanin');
var Promise = require('bluebird');

// base class for all sinks (both client-side views and adapter write procs)
var sink = fanin.extend({
    initialize: function(options, params) {
        // To indicate when the sink is finished, stash a completion trigger in
        // this.done() that resolves the `isDone` promise.
        //
        // The runtime will use this promise to wait until all the sinks have
        // gotten an eof to declare that the program is complete.
        var self = this;
        this.isDone = new Promise(function(resolve, reject) {
            self.done = resolve;
        });
    },
});

module.exports = sink;

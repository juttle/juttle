var _ = require('underscore');
var events = require('backbone').Events;
var Promise = require('bluebird');
var Base = require('extendable-base');
var JuttleErrors = require('../errors');

var ClientSinkManager = Base.extend({
    initialize: function(options, env) {
        this.program = options.program;
        this.sink_classes = options.sink_classes;
        this.events = _.extend({}, events);
        this.env = env;

        this.sinks = {};
    },

    warning: function(msg, err) {
        var self = this;

        self.events.trigger('warning', msg, err);
    },

    error: function(msg, err) {
        var self = this;

        self.events.trigger('error', msg, err);
    },

    // Create the necessary sinks and return a promise that resolves
    // when all sinks have received an eof from the program and
    // fully processed the per-sink data.

    setup: function(program) {
        var self = this;

        self.program.get_client_sinks(program).forEach(function(sink) {

            var sink_class;
            if (_.has(self.sink_classes, sink.name)) {
                sink_class = self.sink_classes[sink.name];
            } else {
                throw JuttleErrors.syntaxError('RT-UNDEFINED', {name: sink.name,
                                                                location: sink.location});
            }

            self.sinks[sink.channel] = new sink_class(sink.options, self.env);

            self.sinks[sink.channel].events.on('warning', function(msg) {
                self.warning(msg);
            });

            self.sinks[sink.channel].events.on('error', function(msg) {
                self.error(msg);
            });
        });

        // Create a set of promises, one for each sink. Each promise
        // resolves when the sink sends an 'end' message, indicating
        // that it has fully handled the eof from the program.
        var sink_promises = _.map(_.values(self.sinks), function(sink) {
            return new Promise(function(resolve, reject) {
                sink.events.on('end', function() {
                    resolve();
                });
            });
        });

        self.program.events.on('sink:mark', function(data) {
            self.sinks[data.channel].mark(data.time);
        });

        self.program.events.on('sink:tick', function(data) {
            self.sinks[data.channel].tick(data.time);
        });

        self.program.events.on('sink:eof', function(data) {
            self.sinks[data.channel].eof();
        });

        self.program.events.on('sink:points', function(data) {
            self.sinks[data.channel].consume(data.points);
        });

        // Return a promise that resolves when all client sinks have
        // fully handled the eof from the program.

        return Promise.settle(sink_promises).then(function(results) {
            // Send errors for any promisies that were rejected
            // (i.e. sinks that had errors)
            results.forEach(function(result) {
                if (result.isRejected()) {
                    self.error(result.reason());
                }
            });

            return undefined;
        }).finally(function() {
            self.program.events.off();
        });
    }
});

module.exports = ClientSinkManager;

'use strict';

var _ = require('underscore');
var events = require('backbone').Events;
var Promise = require('bluebird');
var Base = require('extendable-base');
var JuttleErrors = require('../errors');

var ViewManager = Base.extend({
    initialize: function(options, env) {
        this.program = options.program;
        this.view_classes = options.view_classes;
        this.events = _.extend({}, events);
        this.env = env;

        this.views = {};
    },

    warning: function(msg, err) {
        var self = this;

        self.events.trigger('warning', msg, err);
    },

    error: function(msg, err) {
        var self = this;

        self.events.trigger('error', msg, err);
    },

    // Create the necessary views and return a promise that resolves
    // when all views have received an eof from the program and
    // fully processed the per-view data.

    setup: function(program) {
        var self = this;

        var views = self.program.get_views(program);
        views.forEach(function(view) {

            var view_class;
            if (_.has(self.view_classes, view.name)) {
                view_class = self.view_classes[view.name];
            } else {
                throw JuttleErrors.syntaxError('INVALID-VIEW', {view: view.name,
                                                                   location: view.location});
            }

            // Progressive output only makes sense if there is exactly one view
            // in the program, otherwise the output from the various views gets
            // interleaved.
            //
            // So, unless the user has explicitly set the progressive option,
            // make it default to true iff there is exactly one view in the
            // program.
            if (view.options.progressive === undefined) {
                view.options.progressive = (views.length === 1);
            }

            self.views[view.channel] = new view_class(view.options, self.env);

            self.views[view.channel].events.on('warning', function(msg) {
                self.warning(msg);
            });

            self.views[view.channel].events.on('error', function(msg) {
                self.error(msg);
            });
        });

        // Create a set of promises, one for each view. Each promise
        // resolves when the view sends an 'end' message, indicating
        // that it has fully handled the eof from the program.
        var view_promises = _.map(_.values(self.views), function(view) {
            return new Promise(function(resolve, reject) {
                view.events.on('end', function() {
                    resolve();
                });
            });
        });

        self.program.events.on('view:mark', function(data) {
            self.views[data.channel].mark(data.time);
        });

        self.program.events.on('view:tick', function(data) {
            self.views[data.channel].tick(data.time);
        });

        self.program.events.on('view:eof', function(data) {
            self.views[data.channel].eof();
        });

        self.program.events.on('view:points', function(data) {
            self.views[data.channel].consume(data.points);
        });

        // Return a promise that resolves when all views have
        // fully handled the eof from the program.

        return Promise.settle(view_promises).then(function(results) {
            // Send errors for any promisies that were rejected
            // (i.e. views that had errors)
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

module.exports = ViewManager;

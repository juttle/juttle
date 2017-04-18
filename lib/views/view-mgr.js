'use strict';

var _ = require('underscore');
var EventEmitter = require('eventemitter3');
var Promise = require('bluebird');
var JuttleErrors = require('../errors');
var RawView = require('./raw');

class ViewManager {
    constructor(options, env) {
        this.program = options.program;
        this.view_classes = options.view_classes;
        this.events = new EventEmitter();
        this.env = env;

        this.views = {};
        this.mode = options.mode;
    }

    warning(msg, warn) {
        var self = this;

        self.events.emit('warning', msg, warn);
    }

    error(msg, err) {
        var self = this;

        self.events.emit('error', msg, err);
    }

    // Create the necessary views and return a promise that resolves
    // when all views have received an eof from the program and
    // fully processed the per-view data.

    setup(program) {
        var self = this;

        var views = self.program.get_views(program);
        views.forEach(function(view) {
            var view_class;
            var view_options = view.options;
            if (self.mode === 'raw') {
                view_class = RawView;
                view_options.id = view.channel;
            } else if (self.mode === 'text') {
                view_class = self.view_classes['text'];
                view_options = {};
            } else {
                if (_.has(self.view_classes, view.name)) {
                    view_class = self.view_classes[view.name];
                } else {
                    throw JuttleErrors.syntaxError('INVALID-VIEW', {view: view.name,
                                                                    location: view.location});
                }
            }

            // Progressive output only makes sense if there is exactly one view
            // in the program, otherwise the output from the various views gets
            // interleaved.
            //
            // So, unless the user has explicitly set the progressive option,
            // make it default to true iff there is exactly one view in the
            // program.
            if (view_options.progressive === undefined) {
                view_options.progressive = (views.length === 1);
            }

            self.views[view.channel] = new view_class(view_options, self.env, view.channel);

            self.views[view.channel].events.on('warning', function(msg, warn) {
                self.warning(msg, warn);
            });

            self.views[view.channel].events.on('error', function(msg, err) {
                self.error(msg, err);
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

        self.program.events.on('view:mark', function(event) {
            self.views[event.channel].mark(event.data);
        });

        self.program.events.on('view:tick', function(event) {
            self.views[event.channel].tick(event.data);
        });

        self.program.events.on('view:eof', function(event) {
            self.views[event.channel].eof();
        });

        self.program.events.on('view:points', function(event) {
            self.views[event.channel].consume(event.data);
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
}

module.exports = ViewManager;

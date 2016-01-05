/* jslint node:true */
var Base = require('extendable-base');
var _ = require('underscore');
var events = require('backbone').Events;

// This is a base class used by the other terminal views (text,
// table). Objects of this class should not be created directly.
//
// The View manager creates objects derived from this base
// class to handle streams of data from juttle programs.
var View = Base.extend({
    initialize: function(options, env) {
        this.events = _.extend({}, events);
        this.fstream = options.fstream ? options.fstream : process.stdout;
        this.env = env;
    },

    warn: function(msg) {
        var self = this;

        self.events.trigger('warning', 'view ' + self.name + ': ' + msg);
    },

    error: function(msg) {
        var self = this;

        self.events.trigger('error', 'view ' + self.name + ': ' + msg);
    },

    // The subclass should override one or more of these callbacks to
    // handle marks, ticks, data, or eof.
    mark: function(time) {
    },

    tick: function(time) {
    },

    // Data is an array of points
    consume: function(data) {
    },

    eof: function() {
        var self = this;
        self.events.trigger('end');
    }

});

module.exports = View;

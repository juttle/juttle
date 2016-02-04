'use strict';

var _ = require('underscore');
var base = require('./base');

var JSONLSerializer = base.extend({
    write: function(points) {
        var self = this;
        _.each(points, function(point) {
            self.stream.write(JSON.stringify(point) + '\n');
        });
    },

    done: function() { 
        return Promise.resolve();
    }
});

module.exports = JSONLSerializer;

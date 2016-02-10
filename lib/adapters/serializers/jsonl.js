'use strict';

var _ = require('underscore');
var base = require('./base');

class JSONLSerializer extends base {
    write(points) {
        var self = this;
        _.each(points, function(point) {
            self.stream.write(JSON.stringify(point) + '\n');
        });
    }

    done() { 
        return Promise.resolve();
    }
}

module.exports = JSONLSerializer;

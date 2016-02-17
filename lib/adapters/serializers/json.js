'use strict';

var _ = require('underscore');
var base = require('./base');

class JSONSeralizer extends base {
    constructor(stream, options) {
        super(stream, options);
        this.firstPoint = true;
        this.pointBefore = false;
    }

    write(points) {
        var self = this;

        if (this.firstPoint) {
            this.stream.write('[\n');
            this.firstPoint = false;
        }

        _.each(points, function(point) {
            if (self.pointBefore) {
                self.stream.write(',\n');
            }
            self.stream.write(JSON.stringify(point));
            self.pointBefore = true;
        });
    }

    done() {
        return new Promise((resolve) => {
            if (this.pointBefore) {
                this.stream.write('\n]', resolve);
            } else {
                resolve();
            }
        });
    }
}

module.exports = JSONSeralizer;

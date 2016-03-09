'use strict';

/* jslint node:true */
var EventEmitter = require('eventemitter3');

// This is a base class used by the other terminal views (text,
// table). Objects of this class should not be created directly.
//
// The View manager creates objects derived from this base
// class to handle streams of data from juttle programs.
class View {
    constructor(options, env) {
        this.events = new EventEmitter();
        this.fstream = options.fstream ? options.fstream : process.stdout;
        this.env = env;
    }

    warn(msg) {
        this.events.emit('warning', 'view ' + this.name + ': ' + msg);
    }

    error(msg) {
        this.events.emit('error', 'view ' + this.name + ': ' + msg);
    }

    // The subclass should override one or more of these callbacks to
    // handle marks, ticks, data, or eof.
    mark(mark) {
    }

    tick(time) {
    }

    // Data is an array of points
    consume(data) {
    }

    eof() {
        this.events.emit('end');
    }
}

module.exports = View;

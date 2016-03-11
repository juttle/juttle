'use strict';

var sink = require('./sink');

var INFO = {
    type: 'view',
    options: {}   // documented, non-deprecated options only
};

class view extends sink {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        this.name = params.name;
        this.channel = 'view' + (program.channels++);
    }

    procName() {
        return 'view';
    }

    // When views get points/marks/ticks, they emit events on
    // the related program object. Program users will subscribe for
    // these events to receive the information from the views.
    //
    // Note: not using base.js::trigger as that's used for triggering
    // error/warning events and has special handling of arguments to
    // include proc names including the error/warning.

    mark(mark) {
        this.program.events.emit('view:mark', {channel: this.channel, mark: mark});
    }
    tick(time) {
        this.program.events.emit('view:tick', {channel: this.channel, time: time});
    }
    eof() {
        this.program.events.emit('view:eof', {channel: this.channel});
        this.done();
    }
    process(points) {
        this.program.events.emit('view:points', {channel: this.channel, points: points});
    }

    static get info() {
        return INFO;
    }
}


module.exports = view;

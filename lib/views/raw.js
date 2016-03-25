'use strict';

var View = require('./view');

class RawView extends View {
    constructor(options, env) {
        super(options, env);
        this.name = 'raw';
        this.data = [];
        this.id = options.id;
        this.fstream.write(JSON.stringify({view: this.id, options: options}, null, 4) + '\n');
    }

    consume(points) {
        this.fstream.write(JSON.stringify({view: this.id, type: 'points', data: points}) + '\n');
    }

    // This is called when a batch finishes
    mark(mark) {
        this.fstream.write(JSON.stringify({view: this.id, type: 'mark', data: mark}) + '\n');
    }

    // Called for ticks
    tick(tick) {
        this.fstream.write(JSON.stringify({view: this.id, type: 'tick', data: tick}) + '\n');
    }

    // Called when the stream finishes
    eof() {
        this.fstream.write(JSON.stringify({view: this.id, type: 'eof'}) + '\n', () => {
            this.events.emit('end');
        });
    }
}

module.exports = RawView;

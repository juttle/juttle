'use strict';

var sink = require('./sink');
var adapters = require('../adapters');
var Promise = require('bluebird');

class Write extends sink {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        this.inflight = 0;
        var adapter = adapters.get(params.adapter.name, params.adapter.location);
        if (!adapter.write) {
            throw this.compile_error('JUTTLE-UNSUPPORTED-ADAPTER-MODE', {
                adapter: params.adapter,
                method: 'write'
            });
        }

        this.adapter = new adapter.write(options, params);

        this.adapter.on('error', (err) => {
            this.trigger('error', err);
        });

        this.adapter.on('warning', (err) => {
            this.trigger('warning', err);
        });

        this.adapter.on('wrote', (count) => {
            this.wrote(count);
        });

        this.validate_options(adapter.write.allowedOptions(), adapter.write.requiredOptions());
    }

    procName() {
        return 'write-' + this.params.adapter.name;
    }

    start() {
        this.adapter.start();
    }

    process(points) {
        this.inflight += points.length;
        this.adapter.write(points);
        if (this.inflight > INFLIGHT_LIMIT) {
            this.blocked = true;
            scheduler.stop();
        }
    }

    wrote(count) {
        this.inflight -= count;
        if (this.blocked && this.inflight < INFLIGHT_LIMIT) {
            this.blocked = false;
            scheduler.resume();
        }
    }

    eof() {
        this.logger.debug('eof');
        Promise.try(() => {
            return this.adapter.eof();
        })
        .then(() => {
            this.logger.debug('adapter eof done');
            this.done();
        });
    }

    static get info() {
        return {
            type: 'sink',
            options: {}
        };
    }
}

module.exports = Write;

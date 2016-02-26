'use strict';

var sink = require('./sink');
var adapters = require('../adapters');
var Promise = require('bluebird');

class Write extends sink {
    constructor(options, params, location, program) {
        super(options, params, location, program);
        var adapter = adapters.get(params.adapter.name, params.adapter.location);
        if (!adapter.write) {
            throw this.compile_error('JUTTLE-UNSUPPORTED-ADAPTER-MODE', {
                adapter: params.adapter,
                method: 'write'
            });
        }

        this.validate_options(adapter.write.allowedOptions(), adapter.write.requiredOptions());

        this.adapter = new adapter.write(options, params);

        this.adapter.on('error', (err) => {
            this.trigger('error', err);
        });

        this.adapter.on('warning', (err) => {
            this.trigger('warning', err);
        });
    }

    procName() {
        return 'write-' + this.params.adapter.name;
    }

    start() {
        this.adapter.start();
    }

    process(points) {
        this.adapter.write(points);
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

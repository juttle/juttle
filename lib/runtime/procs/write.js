'use strict';

var sink = require('./sink');
var adapters = require('../adapters');
var Promise = require('bluebird');

var Write = sink.extend({
    initialize: function(options, params) {
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

        this.validate_options(adapter.write.allowedOptions(), adapter.write.requiredOptions());
    },

    procName: function() {
        return 'write-' + this.params.adapter.name;
    },

    start: function() {
        this.adapter.start();
    },

    process: function(points) {
        this.adapter.write(points);
    },

    eof: function() {
        this.logger.debug('eof');
        Promise.try(() => {
            return this.adapter.eof();
        })
        .then(() => {
            this.logger.debug('adapter eof done');
            this.done();
        });
    }
}, {
    info: {
        type: 'sink',
        options: {}
    }
});

module.exports = Write;

'use strict';

var sink = require('./sink');
var adapters = require('../adapters');
var JuttleLogger = require('../../logger');
var Promise = require('bluebird');

var Write = sink.extend({
    procName: 'write',

    initialize: function(options, params) {
        this.params = params;

        this.logger_name = this.logger_name.replace('write', 'write-' + params.adapter);
        this.logger = JuttleLogger.getLogger(this.logger_name);

        var adapter = adapters.get(params.adapter.name, params.adapter.location);
        if (!adapter.write) {
            throw this.compile_error('JUTTLE-UNSUPPORTED-ADAPTER-MODE', {
                adapter: params.adapter,
                method: 'write'
            });
        }

        // This is a temporary hack until all the adapters are converted over to
        // use the new API.
        //
        // Before instantiating the adapter, check if it is actually an
        // implementation of a proc. If so, then it is a "legacy" adapter and
        // needs to be shimmed so that all the methods that it might call to
        // output points actually delegate to this class' implementation which
        // is the one that's actually wired into the flowgraph.
        if (adapter.write.__super__ && adapter.write.__super__.constructor === sink) {
            this.logger.debug('instantiating legacy adapter:', params.adapter);
            this.writer = new adapter.write(options, params, this.location, this.program);

            this.writer.ins = this.ins;

            this.process = function(points) {
                this.writer.process(points);
            };

            this.mark = function(time) {
                this.writer.mark(time);
            };

            this.tick = function(time) {
                this.writer.tick(time);
            };

            this.eof = function() {
                this.writer.eof();
            };

            this.start = function() {
                this.writer.start();
            };

            this.writer.isDone = this.isDone;
            this.writer.done = this.done;
            return;
        }

        this.adapter = new adapter.write(options, params);
        this.procName += ' ' + adapter.name;

        this.adapter.on('error', (err) => {
            this.trigger('error', err);
        });

        this.adapter.on('warning', (err) => {
            this.trigger('warning', err);
        });

        this.validate_options(adapter.write.allowedOptions(), adapter.write.requiredOptions());
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

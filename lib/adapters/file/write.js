'use strict';

var _ = require('underscore');
var fs = require('fs');
var Juttle = require('../../runtime/index').Juttle;
var jsoner = require('jsoner');

var Write = Juttle.proc.sink.extend({
    procName: 'write-file',
    initialize: function(options, params) {
        var allowed_options = ['file', 'bufferLimit', 'append'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'write file',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'file')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', {
                proc: 'write file',
                option: 'file'
            });
        }

        // flush every 100 points
        this.bufferLimit = options.bufferLimit ? options.bufferLimit : 100;
        if (!_.isNumber(this.bufferLimit) || this.bufferLimit < 0 ) {
            throw this.compile_error('RT-OPTION-SHOULD-BE-POSITIVE-INTEGER', {
                option: 'bufferLimit'
            });
        }

        this.append = options.append || false;
        this.filename = options.file;
        this.flushPromise = Promise.resolve();
        this.queue = [];

        if (!this.append) {
            // if we're not appending then lets open file for writing, as the
            // file is created (if it does not exist) or truncated
            // (if it exists).
            var fd = fs.openSync(this.filename, 'w');
            fs.closeSync(fd);
        }
    },

    process: function(points) {
        this.logger.debug('process', points);
        this.queue = this.queue.concat(points);

        if (this.queue.length > this.bufferLimit) {
            this.flush();
        }
    },

    flush: function() {
        this.flushPromise = this.flushPromise
        .then(() => {
            var buffer = this.queue;
            this.queue = [];
            return jsoner.appendFile(this.filename, buffer);
        });

        return this.flushPromise;
    },

    eof: function() {
        this.logger.debug('eof');
        this.flush()
        .then(() => {
            this.done();
        });
    }
});

module.exports = Write;

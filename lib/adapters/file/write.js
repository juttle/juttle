var _ = require('underscore');
var Juttle = require('../../runtime/index').Juttle;
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var Write = Juttle.proc.sink.extend({
    procName: 'write-file',
    initialize: function(options, params) {
        var allowed_options = ['file', 'limit', 'maxFilesize', 'bufferLimit'];
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
                option: "file"
            });
        }

        this.limit = options.limit || 100000;
        if (!_.isNumber(this.limit) || this.limit < 0 ) {
            throw this.compile_error('RT-OPTION-SHOULD-BE-POSITIVE-INTEGER', {
                option: "limit"
            });
        }

        // 200MB limit on file
        this.maxFilesize = options.maxFilesize || 200*1024*1024;
        if (!_.isNumber(this.maxFilesize) || this.maxFilesize < 0 ) {
            throw this.compile_error('RT-OPTION-SHOULD-BE-POSITIVE-INTEGER', {
                option: "maxFilesize"
            });
        }

        // flush every 100 points
        this.bufferLimit = options.bufferLimit ? options.bufferLimit : 100;
        if (!_.isNumber(this.bufferLimit) || this.bufferLimit < 0 ) {
            throw this.compile_error('RT-OPTION-SHOULD-BE-POSITIVE-INTEGER', {
                option: "bufferLimit"
            });
        }

        this.filename = options.file;
        this.queue = [];
    },

    process: function(points) {
        this.logger.debug('process', points);
        this.queue = this.queue.concat(points);
        // if we're due for a flush and don't have a flush in course then
        // fire off another flush
        if (this.queue.length > this.bufferLimit && !this.flushPromise) {
            this.flush();
        }
    },

    flush: function() {
        var self = this;
        var points = [];

        this.flushPromise = fs.statAsync(this.filename)
        .then(function(stats) {
            if (stats.size > self.maxFilesize) {
                throw self.runtime_error('RT-OPTION-VALUE-EXCEEDED', {
                    option: 'maxFilesize',
                    value: self.maxFilesize + ' bytes'
                });
            }
            // we can only read the file if it exists which would be here
            // and only after verifying the maxFileSize has not been
            // exceeded
            return fs.readFileAsync(self.filename, 'utf8')
            .then(function(data) {
                points = JSON.parse(data);
            });
        })
        .catch(function(err) {
            // ignore the ENOENT since that means we don't have an output
            // file to begin with
            if (err.code !== 'ENOENT') {
                throw err;
            }
        })
        .then(function() {
            if (points.length > self.limit) {
                self.trigger('error', self.runtime_error('RT-OPTION-VALUE-EXCEEDED', {
                    option: 'limit',
                    value: self.limit,
                    extra: ', dropping points.'
                }));
                return Promise.resolve();
            } else {
                var space_left = self.limit - points.length;
                if (space_left < self.queue.length) {
                    points = points.concat(self.queue.slice(0, space_left));
                    // error since we really can't take any more points after this and
                    // should stop the whole pipeline
                    self.trigger('error', self.runtime_error('RT-OPTION-VALUE-EXCEEDED', {
                        option: 'limit',
                        value: self.limit,
                        extra: ', dropping points.'
                    }));
                } else {
                    // lets write out some more points
                    points = points.concat(self.queue);
                }
                var data = JSON.stringify(points, null, 4);
                self.queue = [];
                return fs.writeFileAsync(self.filename, data);
            }
        })
        .catch(function(err) {
            self.trigger('error', err);
        }).finally(function() {
            self.flushPromise = null;
        });

        return this.flushPromise;
    },

    eof: function() {
        this.logger.debug('eof');
        var self = this;
        var currentFlush = this.flushPromise || Promise.resolve();
        currentFlush.then(function() {
            // after the current flush is done lets make sure to fire off
            // another one as the previous one could have been somewhere
            // in the middle of the async write and without another flush we
            // would leave points on the self.queue
            return self.flush();
        })
        .then(function() {
            self.done();
        });
    }
});

module.exports = Write;

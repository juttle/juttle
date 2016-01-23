'use strict';

var _ = require('underscore');
var request = require('request');
var Juttle = require('../../runtime').Juttle;

// taken from https://gist.github.com/timruffles/3377784
_.chunk = function(array,chunkSize) {
    return _.reduce(array,function(reducer,item,index) {
        reducer.current.push(item);
        if(reducer.current.length === chunkSize || index + 1 === array.length) {
            reducer.chunks.push(reducer.current);
            reducer.current = [];
        }
        return reducer;
    },{current:[],chunks: []}).chunks;
};

var Write = Juttle.proc.sink.extend({
    procName: 'write-http',

    initialize: function(options, params) {
        var allowed_options = [
            'url',
            'method',
            'headers',
            'maxLength',
            'useArray'
        ];

        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'write http',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'url')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', {
                proc: 'write http',
                option: 'url'
            });
        }

        this.url = options.url;
        this.method = options.method ? options.method : 'POST';
        this.headers = options.headers ? options.headers : {};
        this.headers['content-type'] = 'application/json';
        this.maxLength = options.maxLength ? options.maxLength : 1;

        this.promises = [];
        this.eofs = 0;
        this.in_progress_writes = 0;
    },

    process: function(points) {
        var self = this;
        var chunks = _.chunk(points, this.maxLength);

        self.in_progress_writes++;
        _.each(chunks, function(chunk) {
            if (self.maxLength === 1) {
                // when maxLength is set to 1 we always send the JSON object
                // and not the array
                chunk = chunk[0];
            }
            return request({
                uri: self.url,
                method: self.method,
                headers: self.headers,
                body: JSON.stringify(chunk),
                resolveWithFullResponse: true
            })
            .on('error', function(err) {
                var runtime_error = self.runtime_error('RT-INTERNAL-ERROR', {
                    error: err.toString()
                });
                self.trigger('warning', runtime_error);
            })
            .on('response', function(res) {
                if (!('' + res.statusCode).match(/2\d\d/)) {
                    var body = [];
                    res.on('data', function(chunk) {
                        body.push(chunk);
                    });

                    res.on('end', function() {
                        var runtime_error = self.runtime_error('RT-INTERNAL-ERROR', {
                            error: 'StatusCodeError: ' + res.statusCode + ' - ' + body.join('')
                        });
                        self.trigger('warning', runtime_error);
                    });
                }
            })
            .on('end', function() {
                self.in_progress_writes--;
                self._maybe_done();
            });
        });
    },

    _maybe_done: function() {
        if (this.eofs === this.ins.length && this.in_progress_writes === 0) {
            this.done();
        }
    },

    eof: function(from) {
        this.eofs++;
        this._maybe_done();
    }
});

module.exports = Write;

'use strict';

var _ = require('underscore');
var request = require('request');
var AdapterWrite = require('../adapter-write');
var errors = require('../../errors');

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

class WriteHTTP extends AdapterWrite {
    constructor(options, params) {
        super(options, params);

        this.url = options.url;
        this.method = options.method ? options.method : 'POST';
        this.headers = options.headers ? options.headers : {};
        this.headers['content-type'] = 'application/json';
        this.maxLength = options.maxLength ? options.maxLength : 1;

        this.promises = [];
        this.in_progress_writes = 0;
    }

    static allowedOptions() {
        return ['url', 'method', 'headers', 'maxLength', 'useArray'];
    }

    static requiredOptions() {
        return ['url'];
    }

    write(points) {
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
                var runtime_error = new errors.runtimeError('INTERNAL-ERROR', {
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
                        var runtime_error = new errors.runtimeError('INTERNAL-ERROR', {
                            error: 'StatusCodeError: ' + res.statusCode + ' - ' + body.join('')
                        });
                        self.trigger('warning', runtime_error);
                    });
                }
            })
            .on('end', function() {
                self.in_progress_writes--;
                if (self.done && self.in_progress_writes === 0) {
                    self.done();
                }
            });
        });
    }

    eof() {
        if (this.in_progress_writes === 0) {
            return;
        } else {
            return new Promise((resolve, reject) => {
                this.done = resolve;
            });
        }
    }
}

module.exports = WriteHTTP;

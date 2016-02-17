'use strict';

var _ = require('underscore');
var contentType = require('content-type');
var AdapterRead = require('../../runtime/adapter-read');
var parsers = require('../parsers');
var errors = require('../../errors');
var Promise = require('bluebird');
var request = require('request');
var JuttleMoment = require('../../runtime/types/juttle-moment');

class Iterator {
    constructor(adapter, res, from, to) {
        this.points = [];
        this.done = false;
        this.adapter = adapter;

        var format;
        try {
            format = this.adapter.format || contentType.parse(res).type.split('/')[1];
        } catch(err) {
            // type is undefined
        }

        this.parser = parsers.getParser(format, {
            rootPath: this.adapter.rootPath,
            optimization: this.adapter.optimization_info
        });
        this.adapter.logger.debug('starting parse');
        this.parser.parseStream(res, (points) => {
            points = this.process(res, points, from, to);

            // The current parser API doesn't offer any kind of backpressure,
            // so all we can do is manage our own buffer of points and return
            // them to read as fast as possible.
            this.adapter.logger.debug('got', points.length, 'points');
            this.points = this.points.concat(points);
            this.notify();
        })
        .catch((err) => {
            this.adapter.trigger('error', err);
        })
        .then(() => {
            this.adapter.logger.debug('done');
            this.done = true;
            this.notify();
        });
    }

    process(res, points, from, to) {
        if (!_.isArray(points)) {
            points = [points];
        }

        this.adapter.logger.debug('parsed', points.length, 'points');
        if (this.adapter.includeHeaders) {
            _.each(points, (point) => {
                _.each(res.headers, (value, key) => {
                    point[key] = value;
                });
            });
        }

        this.adapter.parseTime(points, this.adapter.timeField);
        return this.adapter.filterPoints(points, from, to);
    }

    next() {
        // If no points are yet in the buffer and we are not yet done, then wait
        // for the parser to produce some data, otherwise return right away.
        var wait = (this.points.length > 0 || this.done)
            ? Promise.resolve()
            : new Promise((resolve, reject) => {
                this.waiter = resolve;
            });

        return wait.then(() => {
            this.waiter = null;
            var points = this.points;
            this.points = [];
            var ret = {
                state: this,
                points: points,
                readEnd: this.done ? new JuttleMoment(Infinity) : null
            };
            return ret;
        });
    }

    // Check if there are any pending read calls into the adapter and if so,
    // notify them that points have arrived.
    notify() {
        if (this.waiter) {
            this.waiter();
        }
    }
}

class ReadHTTP extends AdapterRead {
    constructor(options, params) {
        super(options, params);

        this.url = options.url;
        this.method = options.method ? options.method : 'GET';
        this.headers = options.headers ? options.headers : {};

        if (!options.headers || !options.headers['content-type']) {
            this.headers['content-type'] = 'application/json';
        }

        this.body = options.body;
        this.timeField = options.timeField;
        this.includeHeaders = options.includeHeaders;
        this.rootPath = options.rootPath;
        this.format = options.format;

        if (params.filter_ast) {
            throw new errors.compileError('ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read http',
                filter: 'filtering'
            });
        }

        this.optimization_info = params && params.optimization_info || {};
    }

    static allowedOptions() {
        var httpOptions = ['url', 'method', 'headers', 'body', 'timeField',
            'includeHeaders', 'rootPath', 'format'];
        return AdapterRead.commonOptions().concat(httpOptions);
    }

    static requiredOptions() {
        return ['url'];
    }

    // Override the default time range to make sure it's set when calling
    // into read.
    defaultTimeOptions() {
        return {
            from: new JuttleMoment(0),
            to: new JuttleMoment(Infinity)
        };
    }

    read(from, to, limit, iterator) {
        // The first read call should kick off the actual fetch request.
        //
        // adapter returns a promise that either rejects with an error or resolves
        // with an iterator object  that handles paging through the results in
        // chunks that we return as the read state.
        if (! iterator) {
            return this.fetch(from, to)
            .then((iterator) => {
                return iterator.next(to);
            });
        } else {
            return iterator.next(to);
        }
    }

    fetch(from, to) {
        return new Promise((resolve, reject) => {
            this.logger.debug('starting request', this.method, this.url);
            request({
                uri: this.url,
                method: this.method,
                headers: this.headers,
                body: JSON.stringify(this.body)
            })
            .on('error', (err) => {
                reject(new errors.runtimeError('INTERNAL-ERROR', {
                    error: err.toString()
                }));
            })
            .on('response', (res) => {
                // Handle non-200 errors by consuming the full response and then
                // throwing an error containing the invalid response.
                if (!('' + res.statusCode).match(/2\d\d/)) {
                    var body = [];
                    res.on('data', function(chunk) {
                        body.push(chunk);
                    });

                    res.on('end', function() {
                        var message = 'StatusCodeError: ' + res.statusCode +
                                      ' - ' + body.join('');
                        reject(new errors.runtimeError('INTERNAL-ERROR', {
                            error: message
                        }));
                    });
                }
                // Otherwise create a new iterator to handle the stream
                else {
                    try {
                        resolve(new Iterator(this, res, from, to));
                    } catch(err) {
                        reject(err);
                    }
                }
            });
        });
    }
}

module.exports = ReadHTTP;

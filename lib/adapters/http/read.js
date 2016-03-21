'use strict';

var _ = require('underscore');
var contentType = require('content-type');
var AdapterRead = require('../adapter-read');
var parsers = require('../parsers');
var errors = require('../../errors');
var parseLinkHeader = require('parse-link-header');
var querystring = require('querystring');
var Promise = require('bluebird');
var request = require('request');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var urlParse = require('url').parse;
var urlFormat = require('url').format;

class Iterator {
    constructor(adapter, res, from, to) {
        this.points = [];
        this.done = false;
        this.adapter = adapter;
        this.total = 0;

        var format;
        try {
            format = this.adapter.format || contentType.parse(res).type.split('/')[1];
        } catch(err) {
            // type is undefined
        }

        this.parser = parsers.getParser(format, this.adapter.parserOptions);

        this.parser
        .on('error', (err) => {
            this.trigger('error', new errors.runtimeError('INTERNAL-ERROR', {
                error: err.toString()
            }));
        });

        if (res.headers['link']) {
            var parsed = parseLinkHeader(res.headers['link']);
            if (parsed.next) {
                this.adapter.logger.debug('following link header', parsed.next.url);
                this.linkHeader = parsed.next.url;
            }
        }

        this.parser.parseStream(res, (points) => {
            points = this.process(res, points, from, to);
            this.total += points.length;

            if (points.length > 0) {
                this.last_point = points[points.length-1];
            }

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
            this.adapter.logger.debug('parse done, got', this.points.length, 'points');
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

        points = this.adapter.parseTime(points, { timeField: this.adapter.timeField });
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
            return {
                points: points,
                state: this,
                readEnd: this.done ? new JuttleMoment(Infinity) : null
            };
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

        if (params.filter_ast) {
            throw new errors.compileError('ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read http',
                filter: 'filtering'
            });
        }

        _.each(['pageParam', 'pageUnit', 'pageStart', 'pageField'], (option) => {
            if (options.followLinkHeader && options[option] !== undefined) {
                throw new errors.compileError('INCOMPATIBLE-OPTION', {
                    option: 'followLinkHeader',
                    other: option
                });
            }
        });

        if (options.pageUnit &&
            !_.contains(['request', 'record'], options.pageUnit)) {
            throw new errors.compileError('INVALID-OPTION-VALUE', {
                option: 'pageUnit',
                supported: 'request, record, field'
            });
        }

        _.each(['pageUnit', 'pageStart'], (option) => {
            if (_.has(options, option) &&
                _.has(options, 'pageField')) {
                throw new errors.compileError('INCOMPATIBLE-OPTION', {
                    option: 'pageField',
                    other: option
                });
            }
        });

        this.url = options.url;
        this.method = options.method ? options.method : 'GET';
        this.headers = options.headers ? options.headers : {};

        if (!options.headers || !options.headers['content-type']) {
            this.headers['content-type'] = 'application/json';
        }

        this.body = options.body;
        this.timeField = options.timeField;
        this.includeHeaders = options.includeHeaders;
        this.format = options.format;
        this.followLinkHeader = options.followLinkHeader;
        this.pageParam = options.pageParam;
        this.pageStart = options.pageStart || 0;
        this.pageField = options.pageField;
        this.pageCount = (this.pageField === undefined ? this.pageStart : undefined);
        this.pageUnit = options.pageUnit || 'request';

        this.parserOptions = options;
        this.parserOptions.optimization = params && params.optimization_info || {};
    }

    static allowedOptions() {
        var httpOptions = [
            'url', 'method', 'headers', 'body', 'timeField', 'includeHeaders',
            'rootPath', 'format', 'followLinkHeader', 'pageParam', 'pageStart',
            'pageUnit', 'pageField', 'separator', 'commentSymbol',
            'ignoreEmptyLines', 'allowIncompleteLines'
        ];

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
        // The first read call should kick off the actual fetch request. This
        // returns a promise that either rejects with an error or resolves with
        // an iterator object that handles paging through the results in chunks
        // that we return as the read state.
        var getIterator = iterator
            ? Promise.resolve(iterator)
            : this.fetch(this.url, from, to);

        return getIterator
        .then((iterator) => {
            return iterator.next();
        })
        .then((result) => {
            // To support paging, check if the current iterator (which is
            // returned in result.state) got any points for the current page. If
            // so, then advance the page and keep going. Otherwise just stop.
            if (this.pageParam && result.readEnd) {
                if (result.state.total === 0) {
                    this.logger.debug('no results for page', this.pageCount, ' -- paging completed');
                } else if (this.pageField && ! _.has(result.state.last_point, this.pageField)) {
                    this.logger.debug(`-pageField set but no ${this.pageField} field found. -- paging completed`);
                    // This shoudn't really happen, so emit a warning.
                    var runtime_error = new errors.runtimeError('INTERNAL-ERROR', {
                        error: `Last point in results did not contain a "${this.pageField}" field -- ending pagination`
                    });
                    this.trigger('warning', runtime_error);
                } else {
                    this.logger.debug('got', result.state.total, 'results for page', this.nextPage);

                    if (this.pageField) {
                        this.pageCount = result.state.last_point[this.pageField];
                        // Clear last_point so it's not used again
                        result.state.last_point = undefined;
                    } else {
                        switch(this.pageUnit) {
                            case 'request':
                                this.pageCount++;
                                break;

                            case 'record':
                                this.pageCount += result.state.total;
                                break;

                        }
                    }

                    result.readEnd = undefined;
                    result.state = undefined;
                }
            }

            // if followLinkHeader is set and there is an actual linkHeader
            // returned from the last fetch then lets follow that link
            if (this.followLinkHeader && result.state.linkHeader) {
                this.url = result.state.linkHeader;
                result.readEnd = undefined;
                result.state = undefined;
            }

            return result;
        });
    }

    fetch(url, from, to) {
        return new Promise((resolve, reject) => {
            if (this.pageParam) {
                // when pageParam is set we manage the URL construction and use
                // the options pageParam, pageStart, pageUnit, and pageField.
                var parsedURL = urlParse(this.url);
                var parsedQueryString = querystring.parse(parsedURL.query);

                // Only add pageCount to the query string if it is
                // defined.  It will be undefined for the initial
                // query when using -pageField.
                if (this.pageCount !== undefined) {
                    parsedQueryString[this.pageParam] = this.pageCount;
                }

                url = urlFormat({
                    protocol: parsedURL.protocol,
                    hostname: parsedURL.hostname,
                    port: parsedURL.port,
                    pathname: parsedURL.pathname,
                    search: '?' + querystring.stringify(parsedQueryString)
                });
            }

            this.logger.debug('starting request', this.method, url);
            request({
                uri: url,
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
                        reject(new errors.runtimeError('HTTP-ERROR', {
                            status: res.statusCode,
                            message: res.statusMessage,
                            body: message
                        }));
                    });
                } else {
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

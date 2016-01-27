'use strict';

var _ = require('underscore');
var contentType = require('content-type');
var Juttle = require('../../runtime').Juttle;
var parsers = require('../parsers');
var request = require('request');

var Read = Juttle.proc.source.extend({
    procName: 'read-http',

    initialize: function(options, params, location, program) {
        var allowed_options = [
            'url',
            'method',
            'headers',
            'body',
            'timeField',
            'includeHeaders',
            'rootPath'
        ];

        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'read http',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'url')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', {
                proc: 'read http',
                option: 'url'
            });
        }

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

        if (params.filter_ast) {
            throw this.compile_error('RT-ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read http',
                filter: 'filtering'
            });
        }

        this.optimization_info = params && params.optimization_info || {};
    },

    triggerFailure: function(message) {
        var runtime_error = this.runtime_error('RT-INTERNAL-ERROR', {
            error: message
        });
        this.trigger('error', runtime_error);
        this.emit_eof();
    },

    start: function() {
        var self = this;

        var req = request({
            uri: this.url,
            method: this.method,
            headers: this.headers,
            body: JSON.stringify(this.body)
        })
        .on('error', function(err) {
            self.triggerFailure(err.toString());
        })
        .on('response', function(res) {
            if (!('' + res.statusCode).match(/2\d\d/)) {
                var body = [];
                res.on('data', function(chunk) {
                    body.push(chunk);
                });

                res.on('end', function() {
                    self.triggerFailure('StatusCodeError: ' + res.statusCode +
                                        ' - ' + body.join(''));
                });
            } else {
                var format;
                try {
                    format  = contentType.parse(res).type.split('/')[1];
                } catch(err) {
                    // type is undefined
                }

                try {
                    self.parser = parsers.getParser(format, {
                        rootPath: self.rootPath,
                        optimization: self.optimization_info
                    });

                    self.parser
                    .on('error', (err) => {
                        this.trigger('error', this.runtime_error('RT-INTERNAL-ERROR', {
                            error: err.toString()
                        }));
                    });

                    self.parser.parseStream(req, function(points) {
                        if (self.includeHeaders) {
                            _.each(points, function(point) {
                                _.each(res.headers, function(value, key) {
                                    point[key] = value;
                                });
                            });
                        }

                        if (!_.isArray(points)) {
                            points = [points];
                        }

                        self.parseTime(points, self.timeField);
                        self.emit(points);
                        self.emit_eof();
                    }).catch(function(err) {
                        self.triggerFailure(err.toString());
                    });
                } catch(err) {
                    self.triggerFailure(err.toString());
                }
            }
        });
    }
});

module.exports = Read;

var _ = require('underscore');
var contentType = require('content-type');
var Juttle = require('../../runtime').Juttle;
var parsers = require('../parsers');
var request = require('request');
var http = require('http');

var Read = Juttle.proc.source.extend({
    procName: 'read-http',

    initialize: function(options, params, location, program) {
        var allowed_options = [
            'url',
            'listen',
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

        if (!_.has(options, 'url') && !_.has(options, 'listen')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', {
                proc: 'read http',
                option: 'url'
            });
        }

        if (_.has(options, 'url')) {
            this.url = options.url;
            this.method = options.method ? options.method : 'GET';
            this.headers = options.headers ? options.headers : {};

            if (!options.headers || !options.headers['content-type']) {
                this.headers['content-type'] = 'application/json';
            }

            this.body = options.body;
            this.includeHeaders = options.includeHeaders;

        } else if (_.has(options, 'listen')) {
            this.port = options.listen;
        }

        this.timeField = options.timeField;
        this.rootPath = options.rootPath;

        if (params.filter_ast) {
            throw this.compile_error('RT-ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read http',
                filter: 'filtering'
            });
        }
    },

    triggerFailure: function(message) {
        var runtime_error = this.runtime_error('RT-INTERNAL-ERROR', {
            error: message
        });
        this.trigger('error', runtime_error);
        this.emit_eof();
    },

    start: function() {
        if (this.url) {
            this._start_fetch();
        } else if (this.port) {
            this._start_listen();
        }
    },

    _start_listen: function() {
        var self = this;

        this.server = http.createServer(function(req, res) {
            try {
                var format = self._get_format(req);

                if (req.method !== 'POST') {
                    throw self.runtime_error('RT-INVALID-HTTP-METHOD', {
                        types: "POST"
                    });
                }

                if (format !== 'json' && format !== 'csv') {
                    throw self.runtime_error('RT-INVALID-TYPE', {
                        types: "csv, json"
                    });
                }

                var emit_points = [];

                var parser =  parsers.getParser(format , {rootPath: self.rootPath});
                parser.parseStream(req, function(points) {
                    if (!_.isArray(points)) {
                        points = [points];
                    }

                    self.parseTime(points, self.timeField);
                    emit_points = emit_points.concat(points);
                })
                .then(function() {
                    self.emit(emit_points);

                    res.statusCode = 200;
                    res.end();
                })
                .catch(function(err) {
                    self._handle_listen_error(res, err);
                });
            } catch (err) {
                self._handle_listen_error(res, err);
            }
        });

        this.server.listen({
            port: this.port,
            path: '/'
        });
    },

    _handle_listen_error: function(res, err) {
        res.statusMessage = err.message;
        res.statusCode = 400;

        if (err.code === 'RT-INVALID-TYPE') {
            res.statusCode = 415;
        } else if (err.code === 'RT-INVALID-HTTP-METHOD') {
            res.statusCode = 404;
        }

        this.trigger('error', err);
        res.end();
    },

    _start_fetch: function() {
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

                try {
                    var parser =  parsers.getParser(self._get_format(res) , {rootPath: self.rootPath});
                    parser.parseStream(req, function(points) {
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
    },

    _get_format: function(res) {
        try {
            return contentType.parse(res).type.split('/')[1];
        } catch(err) {
            // type is undefined
        }
    },

    teardown: function() {
        this.emit_eof();

        if (this.server) {
            this.server.close();
        }
    }
});

module.exports = Read;

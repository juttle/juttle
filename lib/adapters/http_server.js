'use strict';

var http = require('http');
var _ = require('underscore');
var contentType = require('content-type');

var source = require('../runtime/procs/source');
var Promise = require('bluebird');
var parsers = require('./parsers');

var Read = source.extend({
    procName: 'read-http_server',

    initialize: function(options, params, location, program) {
        var allowed_methods = [ 'POST', 'PUT' ];

        var allowed_options = [
            'port',
            'method',
            'timeField',
            'rootPath'
        ];

        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('UNKNOWN-OPTION-ERROR', {
                proc: 'read http_server',
                option: unknown[0]
            });
        }

        if (options.method && allowed_methods.indexOf(options.method) === -1) {
            throw this.compile_error('INVALID-OPTION-VALUE', {
                option: 'method',
                supported: allowed_methods.join(', ')
            });
        }

        this.port = options.port || 8080;
        this.method = options.method || 'POST';
        this.timeField = options.timeField;
        this.rootPath = options.rootPath;

        if (params.filter_ast) {
            throw this.compile_error('ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read http_server',
                filter: 'filtering'
            });
        }
    },

    start: function() {
        var self = this;

        this.server = http.createServer(function(req, res) {
            var format;
            try {
                format = contentType.parse(req).type.split('/')[1];
            }
            catch(err) {
                // type is undefined
            }

            Promise.try(function() {
                if (req.method !== self.method) {
                    throw self.runtime_error('INVALID-HTTP-METHOD', {
                        types: 'POST'
                    });
                }

                if (format !== 'json' && format !== 'csv') {
                    throw self.runtime_error('INVALID-TYPE', {
                        types: 'csv, json'
                    });
                }


                var emit_points = [];

                var parser =  parsers.getParser(format , {rootPath: self.rootPath});
                return parser.parseStream(req, function(points) {
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
                });
            })
            .catch(function(err) {
                self._handle_listen_error(res, err);
            });
        });

        this.server.listen({
            port: this.port,
            path: '/'
        });
    },

    _handle_listen_error: function(res, err) {
        res.statusMessage = err.message;
        res.statusCode = 400;

        if (err.code === 'INVALID-TYPE') {
            res.statusCode = 415;
        } else if (err.code === 'INVALID-HTTP-METHOD') {
            res.statusCode = 404;
        }

        this.trigger('error', err);
        res.end();
    },

    teardown: function() {
        if (this.server) {
            this.server.close();
        }

        this.emit_eof();
    }
});

function HttpServerAdapter(config) {
    return {
        name: 'http_server',
        read: Read
    };
}

module.exports = HttpServerAdapter;

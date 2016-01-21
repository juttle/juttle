var http = require('http');
var _ = require('underscore');
var contentType = require('content-type');

var Juttle = require('../runtime/index').Juttle;
var parsers = require('./parsers');

var Read = Juttle.proc.source.extend({
    procName: 'read-http_server',

    initialize: function(options, params, location, program) {
        var allowed_methods = [ 'POST', 'PUT' ];

        var allowed_options = [
            'port',
            'method',
            'timeField'
        ];

        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'read http_server',
                option: unknown[0]
            });
        }

        if (options.method && allowed_methods.indexOf(options.method) === -1) {
            throw this.compile_error('RT-INVALID-OPTION-VALUE', {
                option: 'method',
                supported: allowed_methods.join(', ')
            });
        }

        this.port = options.port || 8080;
        this.method = options.method || 'POST';
        this.timeField = options.timeField;

        if (params.filter_ast) {
            throw this.compile_error('RT-ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read http_server',
                filter: 'filtering'
            });
        }
    },

    start: function() {
        var self = this;
        var format;

        this.server = http.createServer(function(req, res) {
            try {
                format = contentType.parse(req).type.split('/')[1];
            }
            catch(err) {
                // type is undefined
            }
            try {
                if (req.method !== self.method) {
                    throw self.runtime_error('RT-INVALID-HTTP-METHOD', {
                        types: 'POST'
                    });
                }

                if (format !== 'json' && format !== 'csv') {
                    throw self.runtime_error('RT-INVALID-TYPE', {
                        types: 'csv, json'
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

    teardown: function() {
        this.emit_eof();

        if (this.server) {
            this.server.close();
        }
    }
});

function HttpServerAdapter(config) {
    return {
        name: 'http_server',
        read: Read
    };
}

module.exports = HttpServerAdapter;

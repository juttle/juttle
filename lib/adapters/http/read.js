var _ = require('underscore');
var contentType = require('content-type');
var request = require('request-promise');
var Juttle = require('../../runtime').Juttle;
var parsers = require('../parsers');

var Read = Juttle.proc.source.extend({
    sourceType: 'batch',
    procName: 'read-http',

    initialize: function(options, params, pname, location, program, juttle) {
        var allowed_options = [
            'url',
            'method',
            'headers',
            'body',
            'timeField',
            'includeHeaders'
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

        if (params.filter_ast) {
            throw this.compile_error('RT-ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read http',
                filter: 'filtering'
            });
        }
    },

    start: function() {
        var self = this;

        var req = request({
            uri: this.url,
            method: this.method,
            headers: this.headers,
            body: JSON.stringify(this.body),
            resolveWithFullResponse: true
        });

        req
        .catch(function(err) {
            var runtime_error = self.runtime_error('RT-INTERNAL-ERROR', {
                error: err.toString()
            });
            self.trigger('error', runtime_error);
            self.emit_eof();
        });

        req.on('response', function(res) {
            var format;
            try {
                format  = contentType.parse(res).type.split('/')[1];
            } catch(err) {
                // type is undefined
            }

            try {
                var parser =  parsers.getParser(format);
                return parser.parseStream(req, function(points) {
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
                })
                .catch(function(err) {
                    self.trigger('error', err);
                    self.emit_eof();
                });
            } catch (err) {
                var runtime_error = self.runtime_error('RT-INTERNAL-ERROR', {
                    error: err.toString()
                });
                self.trigger('error', runtime_error);
                self.emit_eof();
            }
        });
    }
});

module.exports = Read;

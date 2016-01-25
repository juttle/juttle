'use strict';

var _ = require('underscore');
var fs = require('fs');
var AdapterRead = require('../../runtime/adapter-read');
var parsers = require('../parsers');
var errors = require('../../errors');

class ReadFile extends AdapterRead {
    static get timeRequired() { return false; }

    constructor(options, params) {
        super(options, params);

        var allowed_options = ['from', 'to', 'last', 'file', 'timeField', 'format', 'pattern'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw new errors.compileError('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'read file',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'file')) {
            throw new errors.compileError('RT-MISSING-OPTION-ERROR', {
                proc: 'read file',
                option: 'file'
            });
        }

        this.filename = options.file;
        this.timeField = options.timeField;
        this.format = options.format ? options.format : 'json'; // default to json

        var optimization_info = params && params.optimization_info || {};
        this.parser = parsers.getParser(this.format, _.extend(options, {
            optimization: optimization_info
        }));

        this.parser
        .on('error', (err) => {
            this.trigger('error', new errors.runtimeError('RT-INTERNAL-ERROR', {
                error: err.toString()
            }));
        });

        if (params.filter_ast) {
            throw new errors.compileError('RT-ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read file',
                filter: 'filtering'
            });
        }
    }

    // do not remove as this is used by lib/runtime/specs/juttle-test-utils
    fetch() {
        return fs.createReadStream(this.filename, { encoding: 'utf8' });
    }

    read(from, to, limit, state) {
        var stream = this.fetch();
        var validPoints = [];
        return this.parser.parseStream(stream, (points) => {
            this.parseTime(points, this.timeField);

            _.each(points, (point) => {
                // timeless points just pass through at this point
                if (point.time && point.time.moment) {
                    if (point.time.gte(from) && point.time.lt(to)) {
                        validPoints.push(point);
                    }
                } else {
                    // timeless points are passed along
                    validPoints.push(point);
                }
            });
        })
        .catch((err) => {
            throw new errors.runtimeError('RT-INTERNAL-ERROR', {
                error: err.toString()
            });
        })
        .then(function() {
            return {
                points: validPoints,
                readEnd: to
            };
        });
    }
}

module.exports = ReadFile;

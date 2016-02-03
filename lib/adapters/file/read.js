'use strict';

var _ = require('underscore');
var fs = require('fs');
var AdapterRead = require('../../runtime/adapter-read');
var parsers = require('../parsers');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var errors = require('../../errors');

class ReadFile extends AdapterRead {
    constructor(options, params) {
        super(options, params);

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
        this.parser = parsers.getParser(this.format, _.extend({
            optimization: optimization_info
        }, options));

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

    // Override the default time range to make sure it's set when calling
    // into read.
    defaultTimeRange() {
        return {
            from: new JuttleMoment(0),
            to: new JuttleMoment(Infinity)
        };
    }

    allowedOptions() {
        return ['file', 'format', 'pattern'];
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
        .then(function() {
            return {
                points: validPoints,
                readEnd: to
            };
        })
        .catch((err) => {
            throw new errors.runtimeError('RT-INTERNAL-ERROR', {
                error: err.toString()
            });
        });
    }
}

module.exports = ReadFile;

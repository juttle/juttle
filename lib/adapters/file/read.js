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

        this.filename = options.file;
        this.timeField = options.timeField;
        this.format = options.format ? options.format : 'json'; // default to json

        var optimization_info = params && params.optimization_info || {};
        this.parser = parsers.getParser(this.format, _.extend({
            optimization: optimization_info
        }, options));

        this.parser
        .on('error', (err) => {
            this.trigger('error', new errors.runtimeError('INTERNAL-ERROR', {
                error: err.toString()
            }));
        });

        if (params.filter_ast) {
            throw new errors.compileError('ADAPTER-UNSUPPORTED-FILTER', {
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

    static allowedOptions() {
        return AdapterRead.commonOptions.concat(['file', 'format', 'pattern']);
    }

    static requiredOptions() {
        return ['file'];
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
            validPoints = validPoints.concat(this.filterPoints(points, from, to));
        })
        .then(function() {
            return {
                points: validPoints,
                readEnd: to
            };
        })
        .catch((err) => {
            throw new errors.runtimeError('INTERNAL-ERROR', {
                error: err.toString()
            });
        });
    }
}

module.exports = ReadFile;

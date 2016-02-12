'use strict';
/* eslint-env node */
var _ = require('underscore');
var AdapterRead = require('../adapter-read');
var parsers = require('../parsers');
var errors = require('../../errors');

class ReadStdio extends AdapterRead {
    constructor(options, params) {
        super(options, params);

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
                proc: 'read stdio',
                filter: 'filtering'
            });
        }

        this.points = [];
    }

    static allowedOptions() {
        return AdapterRead.commonOptions().concat(['timeField', 'format', 'pattern']);
    }

    getStdin() {
        return process.stdin;
    }

    read(from, to, limit, state) {
        return this.parser.parseStream(this.getStdin(), (points) => {
            points = this.parseTime(points, { timeField: this.timeField });
            this.points = this.points.concat(points);
        })
        .catch((err) => {
            this.trigger('error', new errors.runtimeError('INTERNAL-ERROR', {
                error: err.toString()
            }));
        })
        .then(() => {
            return {
                points: this.points,
                eof: true
            };
        });
    }
}

module.exports = ReadStdio;

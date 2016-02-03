'use strict';
/* eslint-env node */
var _ = require('underscore');
var AdapterRead = require('../../runtime/adapter-read');
var parsers = require('../parsers');
var errors = require('../../errors');
var JuttleMoment = require('../../runtime/types/juttle-moment');

class ReadStdio extends AdapterRead {
    constructor(options, params) {
        super(options, params);

        this.procName = 'read stdio';

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
                proc: this.procName,
                filter: 'filtering'
            });
        }

        this.points = [];
    }

    allowedOptions() {
        return ['timeField', 'format', 'pattern'];
    }

    getStdin() {
        return process.stdin;
    }

    read(from, to, limit, state) {
        return this.parser.parseStream(this.getStdin(), (points) => {
            this.parseTime(points, this.timeField);
            this.points = this.points.concat(points);
        })
        .catch((err) => {
            this.trigger('error', new errors.runtimeError('RT-INTERNAL-ERROR', {
                error: err.toString()
            }));
        })
        .then(() => {
            return {
                points: this.points,
                readEnd: new JuttleMoment(Infinity)
            };
        });
    }
}

module.exports = ReadStdio;

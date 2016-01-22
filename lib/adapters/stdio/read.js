'use strict';

/* eslint-env node */
var _ = require('underscore');
var Juttle = require('../../runtime/index').Juttle;
var parsers = require('../parsers');

var Read = Juttle.proc.source.extend({
    sourceType: 'batch',
    procName: 'read stdio',

    initialize: function(options, params, location, program) {
        var allowed_options = ['timeField', 'format', 'pattern'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: this.procName,
                option: unknown[0]
            });
        }

        this.timeField = options.timeField;

        this.format = options.format ? options.format : 'json'; // default to json
        this.parser = parsers.getParser(this.format, options);

        if (params.filter_ast) {
            throw this.compile_error('RT-ADAPTER-UNSUPPORTED-FILTER', {
                proc: this.procName,
                filter: 'filtering'
            });
        }
    },

    getStdin: function() {
        return process.stdin;
    },

    start: function() {
        var self = this;

        self.parser.parseStream(this.getStdin(), function(points) {
            self.parseTime(points, self.timeField);
            self.emit(points);
        })
        .catch(function(err) {
            self.trigger('error', self.runtime_error('RT-INTERNAL-ERROR', {
                error: err.toString()
            }));
        })
        .finally(function() {
            self.eof();
        });
    }
});

module.exports = Read;

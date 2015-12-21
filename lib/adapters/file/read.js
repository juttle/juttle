var _ = require('underscore');
var Juttle = require('../../runtime/index').Juttle;
var parsers = require('../parsers');
var fs = require('fs');
var values = require('../runtime/values');

var Read = Juttle.proc.source.extend({
    sourceType: 'batch',
    procName: 'read-file',

    initialize: function(options, params, pname, location, program, juttle) {
        var allowed_options = ['from', 'to', 'file', 'timeField', 'format'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'read file',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'file')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', {
                proc: 'read file',
                option: 'file'
            });
        }

        this.filename = options.file;
        this.timeField = options.timeField;
        this.format = options.format ? options.format : 'json'; // default to json
        this.parser = parsers.getParser(this.format);

        this.from = options.from || new JuttleMoment(0);
        if (!this.from.moment) {
            throw this.compile_error('RT-FROM-TO-MOMENT-ERROR', {
                value: values.inspect(this.from)
            });
        }

        this.to = options.to || this.program.now;
        if (!this.to.moment) {
            throw this.compile_error('RT-FROM-TO-MOMENT-ERROR', {
                value: values.inspect(this.to)
            });
        }

        if (params.filter_ast) {
            throw this.compile_error('RT-ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read file',
                filter: 'filtering'
            });
        }
    },

    // do not remove as this is used by lib/runtime/specs/juttle-test-utils
    fetch: function() {
        return fs.createReadStream(this.filename, { encoding: 'utf8' });
    },

    start: function() {
        var self = this;
        var stream = this.fetch();

        self.parser.parseStream(stream, function(points) {
            var validPoints = [];
            self.parseTime(points, self.timeField);
            _.each(points, function(point) {
                // timeless points just pass through at this point
                if (point.time && point.time.moment) {
                    if (point.time.gte(self.from) && point.time.lt(self.to)) {
                        validPoints.push(point);
                    }
                } else {
                    // timeless points are passed along
                    validPoints.push(point);
                }
            });
            self.emit(validPoints);
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

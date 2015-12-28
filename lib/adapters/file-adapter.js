//
// Simple Juttle adapter that implements a single file "database".
//
// The "filename" option indicates a file to read/write from and it must contain
// a JSON array of objects.
//
// The filters passed in the read parameterrs are executed to filter the points
// from the file.

/* jshint evil: true */

var _ = require('underscore');
var Juttle = require('../runtime/index').Juttle;
var JuttleMoment = require('../moment').JuttleMoment;
var parsers = require('./parsers');
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

var Write = Juttle.proc.sink.extend({
    procName: 'write-file',
    initialize: function(options, params) {
        var allowed_options = ['file'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'write file',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'file')) {
            throw this.compile_error('RT-MISSING-OPTION-ERROR', {
                proc: 'write file',
                option: "file"
            });
        }

        this.filename = options.file;
        this.queue = [];
    },

    process: function(points) {
        this.logger.debug('process', points);
        this.queue = this.queue.concat(points);
    },

    flush: function() {
        // XXX/demmer this should be asynchronous
        var data;
        var points = [];
        try {
            data = fs.readFileSync(this.filename, 'utf8');
            points = JSON.parse(data);
        } catch (err) {
            if (err.code !== 'ENOENT') {
                this.logger.error('error reading file:', err.toString());
            }
        }
        points = points.concat(this.queue);
        data = JSON.stringify(points, null, 4);
        fs.writeFileSync(this.filename, data);

        this.queue = [];
    },

    eof: function() {
        this.logger.debug('eof');
        this.flush();
        this.done();
    }
});

function FileAdapter(config) {
    return {
        name: 'file',
        read: Read,
        write: Write
    };
}

module.exports = FileAdapter;

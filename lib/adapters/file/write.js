var _ = require('underscore');
var Juttle = require('../../runtime/index').Juttle;
var fs = require('fs');

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

module.exports = Write;

'use strict';

var _ = require('underscore');
var Juttle = require('../../runtime/index').Juttle;
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var serializers = require('../serializers');

var Write = Juttle.proc.sink.extend({
    procName: 'write-file',
    initialize: function(options, params) {
        var allowed_options = ['file', 'format'];
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
                option: 'file'
            });
        }

        this.filename = options.file;
        this.format = options.format ? options.format : 'json'; // default to json
        var stream = fs.createWriteStream(this.filename);
        this.serializer = serializers.getSerializer(this.format, stream, {});

        var self = this;
        this.serializer
        .on('error', function(err) {
            // during write no fatal errors
            self.trigger('warning', err);
        });
    },

    process: function(points) {
        this.serializer.write(points);
    },

    eof: function() {
        return this.serializer.done()
        .then(() => {
            this.done();
        });
    }
});

module.exports = Write;

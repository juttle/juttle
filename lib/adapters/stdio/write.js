/* eslint-env node */
var _ = require('underscore');
var Juttle = require('../../runtime').Juttle;
var serializers = require('../serializers');

var Write = Juttle.proc.sink.extend({
    procName: 'write stdio',

    initialize: function(options, params) {
        var allowed_options = ['format'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw this.compile_error('RT-UNKNOWN-OPTION-ERROR', {
                proc: this.procName,
                option: unknown[0]
            });
        }

        this.format = options.format ? options.format : 'jsonl'; // default to jsonl
        this.serializer = serializers.getSerializer(this.format, this.getStdout(), {});

        var self = this;
        this.serializer
        .on('error', function(err) {
            // during write no fatal errors
            self.trigger('warning', err);
        });
    },

    getStdout: function() {
        return process.stdout;
    },

    process: function(points) {
        this.serializer.write(points);
    },

    eof: function() {
        this.serializer.done();
        this.done();
    }
});

module.exports = Write;

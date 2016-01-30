'use strict';
/* eslint-env node */
var _ = require('underscore');
var serializers = require('../serializers');
var AdapterWrite = require('../../runtime/adapter-write');
var errors = require('../../errors');

class WriteStdio extends AdapterWrite {
    constructor(options, params) {
        super(options, params);

        var allowed_options = ['format'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw new errors.compileError('RT-UNKNOWN-OPTION-ERROR', {
                proc: 'write stdio',
                option: unknown[0]
            });
        }

        this.format = options.format ? options.format : 'jsonl'; // default to jsonl
        this.serializer = serializers.getSerializer(this.format, this.getStdout(), {});

        this.serializer
        .on('error', (err) => {
            // during write no fatal errors
            this.trigger('warning', err);
        });
    }

    getStdout() {
        return process.stdout;
    }

    write(points) {
        this.serializer.write(points);
    }

    eof() {
        return this.serializer.done();
    }
}

module.exports = WriteStdio;

'use strict';
/* eslint-env node */
var serializers = require('../serializers');
var AdapterWrite = require('../adapter-write');

class WriteStdio extends AdapterWrite {
    constructor(options, params) {
        super(options, params);

        this.format = options.format ? options.format : 'jsonl'; // default to jsonl
        this.serializer = serializers.getSerializer(this.format, this.getStdout(), {});

        this.serializer
        .on('error', (err) => {
            // during write no fatal errors
            this.trigger('warning', err);
        });
    }

    static allowedOptions() {
        return ['format'];
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

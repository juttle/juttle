'use strict';

var _ = require('underscore');
var AdapterWrite = require('../../runtime/adapter-write');
var errors = require('../../errors');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var serializers = require('../serializers');

class WriteFile extends AdapterWrite {
    constructor(options, params) {
        super(options, params);

        var allowed_options = ['file', 'format'];
        var unknown = _.difference(_.keys(options), allowed_options);
        if (unknown.length > 0) {
            throw new errors.compileError('UNKNOWN-OPTION-ERROR', {
                proc: 'write file',
                option: unknown[0]
            });
        }

        if (!_.has(options, 'file')) {
            throw new errors.compileError('MISSING-OPTION-ERROR', {
                proc: 'write file',
                option: 'file'
            });
        }

        this.filename = options.file;
        this.format = options.format ? options.format : 'json'; // default to json
    }

    start() {
        var stream = fs.createWriteStream(this.filename);
        this.serializer = serializers.getSerializer(this.format, stream, {});

        this.serializer.on('error', (err) => {
            // during write no fatal errors
            this.trigger('warning', err);
        });
    }

    write(points) {
        this.logger.debug('write', points);
        this.serializer.write(points);
    }

    eof() {
        return this.serializer.done();
    }
}

module.exports = WriteFile;

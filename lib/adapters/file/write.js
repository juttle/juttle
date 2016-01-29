'use strict';

var _ = require('underscore');
var AdapterWrite = require('../../runtime/adapter-write');
var errors = require('../../errors');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var readline = require('readline');
var serializers = require('../serializers');

class WriteFile extends AdapterWrite {
    constructor(options, params) {
        super(options, params);

        if (!_.has(options, 'file')) {
            throw new errors.compileError('RT-MISSING-OPTION-ERROR', {
                proc: 'write file',
                option: 'file'
            });
        }

        this.filename = options.file;
        this.format = options.format ? options.format : 'json'; // default to json

        this.append = options.append;
        this.serializerOptions = {};
        if (options.append && !_.contains(['jsonl', 'csv'], options.format)) {
            throw new errors.compileError('RT-INVALID-OPTION-COMBINATION',{
                option: 'append',
                rule: 'format="csv" or format="jsonl"'
            });
        }
    }

    _readHeaders() {
        // in the case of wanting to append to a csv file we'll have to read
        // the header of that file before we can proceed to attempt and append
        // points while making sure the new inbound points are valid within
        // the context of the existing headers
        if (this.append && this.format === 'csv') {
            return fs.accessAsync(this.filename)
            .then(() => {
                return new Promise((resolve, reject) => {
                    // since the file exists lets make sure to let the csv
                    // serializer to not send the headers
                    this.serializerOptions.sendHeaders = false;

                    // read the first line and initialize the headers with that
                    var stream = fs.createReadStream(this.filename);

                    var liner = readline.createInterface({
                        input: stream,
                        terminal: false
                    });

                    liner.on('line', (line) => {
                        // there will be a few lines process before the
                        // readline instance notices the stream has been closed
                        if (!this.serializerOptions.headers) {
                            this.serializerOptions.headers = line.split(',');
                            stream.close();
                            resolve();
                        }
                    });

                    liner.on('end', () => {
                        resolve();
                    });

                    stream.on('error', (err) => {
                        reject(err);
                    });
                });
            })
            .catch((err) => {
                // no file then let this exception go
                if (!err.toString().match(/ENOENT/)) {
                    throw err;
                }
            });
        }

        return Promise.resolve();
    }

    static allowedOptions() {
        return ['file', 'format', 'append'];
    }

    start() {
        this.promiseChain = this._readHeaders()
        .then(() => {
            var stream = fs.createWriteStream(this.filename, {
                flags: this.append ? 'a' : 'w'
            });

            this.serializer = serializers
            .getSerializer(this.format, stream, this.serializerOptions);

            this.serializer.on('error', (err) => {
                // during write no fatal errors
                this.trigger('warning', err);
            });
        });
    }

    write(points) {
        this.logger.debug('write', points);

        this.promiseChain = this.promiseChain
        .then(() => {
            this.serializer.write(points);
        });
    }

    eof() {
        return this.promiseChain
        .then(() => {
            this.serializer.done();
        });
    }
}

module.exports = WriteFile;

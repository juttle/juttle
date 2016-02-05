'use strict';

var _ = require('underscore');
var base = require('./base');
var csv = require('csv-write-stream');
var errors = require('../../errors');
var values = require('../../runtime/values');
var readline = require('readline');

var CSVSerializer = base.extend({

    initialize: function(stream, options) {
        options = options  || {};

        if (options.append && !options.input) {
            throw errors.runtimeError('INTERNAL-ERROR', {
                error: 'input stream must be provided when appending'
            });
        }

        this.append = options.append;
        this.input = options.input;
        if (this.append) {
            this.base = new Promise((resolve, reject) => {
                var liner = readline.createInterface({
                    input: this.input,
                    terminal: false
                });

                liner.on('line', (line) => {
                    // there will be a few lines process before the
                    // readline instance notices the stream has been closed
                    if (!this.headers) {
                        this.sendHeaders = false;
                        this.headers = line.split(',');
                        this.input.close();
                        liner.close();
                    }
                });

                liner.on('close', () => {
                    resolve();
                });

                this.input.on('error', (err) => {
                    reject(err);
                });
            });
        } else {
            this.base = Promise.resolve();
        }
    },

    write: function(points) {
        this.base = this.base
        .then(() => {
            _.each(points, (point) => {
                var keys = _.keys(point);

                _.each(point, (value, key) => {
                    if (values.isArray(value) || values.isObject(value)) {
                        point[key] = JSON.stringify(value);
                    }
                });

                if (!this.headers) {
                    this.headers = keys;
                }

                if (!this.csvWriter) {
                    this.csvWriter = csv({
                        sendHeaders: this.sendHeaders,
                        headers: this.headers
                    });
                    this.csvWriter.pipe(this.stream);
                }

                var diff = _.difference(keys, this.headers);
                if (diff.length > 0) {
                    this.emit('error', errors.runtimeError('INVALID-CSV',{
                        detail: 'Found new or missing fields: ' + diff
                    }));
                } else {
                    this.csvWriter.write(point);
                }
            });
        });
    },

    done: function() {
        return this.base
        .then(() => {
            return new Promise((resolve) => {
                if (this.csvWriter) {
                    this.csvWriter.end(() => {
                        resolve();
                    });
                } else {
                    resolve();
                }
            });
        });
    }
});

module.exports = CSVSerializer;

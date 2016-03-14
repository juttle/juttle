'use strict';

var base = require('./base');
var csv = require('fast-csv');
var errors = require('../../errors');
var Promise = require('bluebird');

class CSVParser extends base {
    constructor(options) {
        super(options);
        this.separator = options.separator ? options.separator : ',';
    }

    parseStream(stream, emit) {
        var self = this;

        return new Promise(function(resolve, reject) {
            var buffer = [];

            var csvStream = csv({
                headers: true,
                delimiter: self.separator,
                strictColumnHandling: true
            })
            .on('data', function(pt) {
                self.totalRead++;
                if (self.doneParsing) {
                    return;
                }
                self.totalParsed++;

                if (self.totalParsed > self.stopAt) {
                    self.doneParsing = true;
                    emit(buffer);
                    buffer = [];
                    csvStream.emit('end');
                } else {
                    buffer.push(pt);
                    if (buffer.length >= self.limit) {
                        emit(buffer);
                        buffer = [];
                    }
                }
            });

            csvStream.on('end', function(){
                emit(buffer);
                resolve();
            });

            csvStream.on('data-invalid', function(err) {
                if (!self.doneParsing) {
                    // ignore CSV errors after we're done parsing since
                    // since these are points we're no longer pushing
                    // downstream
                    reject(errors.runtimeError('INVALID-DATA',{
                        type: 'CSV',
                        // totalRead + 1 because totalRead doesn't count the header line
                        detail: `"${err.toString()}" at line ${self.totalRead + 1} ` +
                                `does not match header line`
                    }));
                }
            });

            stream.on('error', function(err) {
                reject(err);
            });

            stream.pipe(csvStream);
        });
    }
}

module.exports = CSVParser;

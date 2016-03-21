'use strict';

var base = require('./base');
var csv = require('fast-csv');
var errors = require('../../errors');
var Promise = require('bluebird');

class CSVParser extends base {
    constructor(options) {
        super(options);
        this.separator = options.separator ? options.separator : ',';
        this.commentSymbol = options.commentSymbol ? options.commentSymbol : null;
        this.ignoreEmptyLines = options.ignoreEmptyLines === true ? true : false;
        this.allowIncompleteLines = options.allowIncompleteLines ? options.allowIncompleteLines : false;
    }

    parseStream(stream, emit) {
        return new Promise((resolve, reject) => {
            var buffer = [];
            var csvStream = csv({
                headers: true,
                delimiter: this.separator,
                comment: this.commentSymbol,
                strictColumnHandling: this.allowIncompleteLines === true ? false : true,
                ignoreEmpty: this.ignoreEmptyLines
            })
            .on('data', (pt) => {
                this.totalRead++;
                if (this.doneParsing) {
                    return;
                }
                this.totalParsed++;

                if (this.totalParsed > this.stopAt) {
                    this.doneParsing = true;
                    emit(buffer);
                    buffer = [];
                    csvStream.emit('end');
                } else {
                    buffer.push(pt);
                    if (buffer.length >= this.limit) {
                        emit(buffer);
                        buffer = [];
                    }
                }
            });

            csvStream.on('end', () => {
                emit(buffer);
                resolve();
            });

            csvStream.on('data-invalid', (err) => {
                if (!this.doneParsing) {
                    // ignore CSV errors after we're done parsing since
                    // since these are points we're no longer pushing
                    // downstream
                    reject(errors.runtimeError('INVALID-DATA',{
                        type: 'CSV',
                        // totalRead + 1 because totalRead doesn't count the header line
                        detail: `"${err.toString()}" at line ${this.totalRead + 1} ` +
                                `does not match header line`
                    }));
                }
            });

            stream.on('error', (err) => {
                reject(err);
            });

            stream.pipe(csvStream);
        });
    }
}

module.exports = CSVParser;

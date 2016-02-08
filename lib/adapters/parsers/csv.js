'use strict';

var base = require('./base');
var csvParser = require('csv-parser');
var errors = require('../../errors');
var Promise = require('bluebird');

var CSVParser = base.extend({

    initialize: function(options) {
        this.separator = options.separator ? options.separator : ',';
    },

    parseStream: function(stream, emit) {
        var self = this;

        return new Promise(function(resolve, reject) {
            var buffer = [];
            var csvStream = csvParser({
                separator: self.separator,
                strict: true
            });

            csvStream.on('data', function(pt) {
                self.totalRead++;
                if (self.doneParsing) {
                    return;
                }
                self.totalParsed++;

                if (self.totalParsed > self.stopAt) {
                    self.doneParsing = true;
                    emit(buffer);
                    buffer = [];
                    csvStream.end();
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

            csvStream.on('error', function(err) {
                if (!self.doneParsing) {
                    // ignore CSV errors after we're done parsing since
                    // since these are points we're no longer pushing
                    // downstream
                    reject(errors.runtimeError('INVALID-CSV',{
                        detail: err.toString()
                    }));
                }
            });

            stream.on('error', function(err) {
                reject(err);
            });

            stream.pipe(csvStream);
        });
    }
});

module.exports = CSVParser;

'use strict';

var base = require('./base');
var errors = require('../../errors');
var JSONStream = require('JSONStream');
var Promise = require('bluebird');

var JSONLParser = base.extend({

    parseStream: function(stream, emit) {
        var self = this;

        return new Promise(function(resolve, reject) {
            var parser = JSONStream.parse();
            var buffer = [];

            parser.on('data', function (pt) {
                self.totalRead++;
                if (self.doneParsing) { 
                    return;
                }
                self.totalParsed++;

                if (self.totalParsed > self.stopAt) {
                    self.doneParsing = true;
                    emit(buffer);
                    buffer=[];
                    parser.end();
                } else { 
                    buffer.push(pt);
                    if (buffer.length >= self.limit) {
                        emit(buffer);
                        buffer = [];
                    }
                }
            });
            parser.on('end', function(){
                emit(buffer);
                resolve();
            });

            parser.on('error', function(err) {
                reject(errors.runtimeError('RT-INVALID-JSONL-ERROR',{
                    detail: err.toString()
                }));
            });

            stream.on('error', function(err) {
                reject(err);
            });

            stream.pipe(parser);
        });
    }

});

module.exports = JSONLParser;

var base = require('./base');
var csvParser = require('csv-parser');
var errors = require('../../errors');
var Promise = require('bluebird');

module.exports = base.extend({

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

            csvStream.on('data', function(pt){
                buffer.push(pt);
                if (buffer.length >= self.limit) {
                    emit(buffer);
                    buffer = [];
                }
            });

            csvStream.on('end', function(){
                emit(buffer);
                resolve();
            });

            csvStream.on('error', function(err) {
                reject(errors.runtimeError('RT-INVALID-CSV-ERROR',{
                    detail: err.toString()
                }));
            });

            stream.on('error', function(err) {
                reject(err);
            });

            stream.pipe(csvStream);
        });
    }
});

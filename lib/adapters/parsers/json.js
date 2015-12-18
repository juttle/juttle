var _ = require('underscore');
var base = require('./base');
var errors = require('../../errors');
var oboe = require('oboe');
var Promise = require('bluebird');

module.exports = base.extend({

    parseStream: function(stream, emit) {
        var self = this;

        return new Promise(function(resolve, reject) {
            var buffer = [];

            oboe(stream)
            .node('*', function (pt) {
                if (!_.isObject(pt) || _.isArray(pt) ) {
                    return;
                }

                buffer.push(pt);
                if (buffer.length >= self.limit) {
                    emit(buffer);
                    buffer = [];
                }
            })
            .on('end', function(){
                emit(buffer);
                resolve();
            })
            .on('fail', function(err) {
                reject(errors.compileError('RT-INVALID-JSON-ERROR',{
                    detail: err.toString()
                }));
            });

            stream.on('error', function(err) {
                reject(err);
            });
        });
    }
});

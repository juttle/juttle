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
            .node('*', function (point, path) {
                if (!_.isObject(point) || _.isArray(point) ) {
                    return;
                }

                // we only care for points that are at the most 1 path element
                // deep and that path element happens to be an number which
                // means we're handling a point within a top level JSON Array
                if (path.length > 1 || (path.length === 1 && !_.isNumber(path[0]))) {
                    return;
                }

                buffer.push(point);
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

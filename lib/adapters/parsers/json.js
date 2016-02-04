'use strict';

var _ = require('underscore');
var base = require('./base');
var errors = require('../../errors');
var oboe = require('oboe');
var Promise = require('bluebird');

var JSONParser = base.extend({
    initialize: function(options) {
        this.rootPath = options.rootPath || undefined;
    },

    parseStream: function(stream, emit) {
        var self = this;
        var rootPath = self.rootPath || '';

        return new Promise(function(resolve, reject) {
            var buffer = [];

            oboe(stream)
            .node('*', function (point, path) {
                if (!_.isObject(point) || _.isArray(point) ) {
                    return;
                }

                // we only care for points that match the expected root path or
                // an element of the array at the given root path.
                //
                // to that end, remove any trailing numbers from the path to
                // handle the case where the field is an array, then compare the
                // path with the configured root.
                if (_.isNumber(path[path.length - 1])) {
                    path = path.slice(0, path.length - 1);
                }

                if (path.join('.') !== rootPath) {
                    return;
                }
                self.totalRead++;
                self.totalParsed++;

                if (self.totalParsed > self.stopAt) {
                    emit(buffer);
                    buffer=[];
                    this.abort(); // tell oboe to shut things down
                    this.emit('end');
                } else {
                    buffer.push(point);
                    if (buffer.length >= self.limit) {
                        emit(buffer);
                        buffer = [];
                    }
                }

                return oboe.drop;
            })
            .on('end', function(){
                emit(buffer);
                resolve();
            })
            .on('fail', function(err) {
                reject(errors.runtimeError('RT-INVALID-JSON-ERROR',{
                    detail: err.toString()
                }));
            });

            stream.on('error', function(err) {
                reject(err);
            });
        });
    }
});

module.exports = JSONParser;

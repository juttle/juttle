'use strict';

var base = require('./base');
var errors = require('../../errors');
var grok = require('node-grok');
var Promise = require('bluebird');
var readline = require('readline');

module.exports = base.extend({

    initialize: function(options) {
        this.pattern = options.pattern || '%{GREEDYDATA:message}';
    },

    parseStream: function(stream, emit) {
        var self = this;

        return new Promise(function(resolve, reject) {
            var buffer = [];
            var currentPromise = Promise.resolve();

            function maybeFlush() {
                if (buffer.length >= self.limit) {
                    emit(buffer);
                    buffer = [];
                }
            }

            grok.loadDefault(function(patterns) {
                var pattern = patterns.createPattern(self.pattern);
                var parse = Promise.promisify(pattern.parse);

                var liner = readline.createInterface({
                    input: stream,
                    terminal: false
                });

                liner.on('line', function(line) {
                    currentPromise = currentPromise.then(function() {
                        return parse(line)
                        .then(function(result) {
                            if (result[1]) {
                                buffer.push(result[0]);
                            } else {
                                self.emit('error', errors.runtimeError('RT-INTERNAL-ERROR',{
                                    error: 'Skipping line "' + line + '", due to: not matching pattern'
                                }));
                            }
                            maybeFlush();
                        })
                        .catch(function(err) {
                            self.emit('error', errors.runtimeError('RT-INTERNAL-ERROR',{
                                error: 'Skipping line "' + line + '", due to: ' + err.toString()
                            }));
                        });
                    });
                });

                liner.on('close', function() {
                    currentPromise.then(function() {
                        emit(buffer);
                        resolve();
                    });
                });
            });
        });
    }
});

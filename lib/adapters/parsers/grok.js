'use strict';

var base = require('./base');
var errors = require('../../errors');
// initialized in constructor
var grok;
var Promise = require('bluebird');
var readline = require('readline');

class GrokParser extends base {
    constructor(options) {
        super(options);
        this.pattern = options.pattern || '%{GREEDYDATA:message}';

        try {
            grok = require('node-grok');
        } catch(err) {
            if (err.toString().match(/Cannot find module 'node-grok'/)) {
                // we're doing this to avoid installing a more heavy weight dependency
                // as part of the regular juttle dependencies.
                throw Error('Grok parser requires a manual installation of node-grok like so:\n' +
                            ' > npm install node-grok@1.0.5\n');
            } else {
                throw err;
            }
        }
    }

    parseStream(stream, emit) {
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
                            self.totalRead++;
                            // readline doesn't immediately stop so you'll get a few stray
                            // 'line' events.
                            if (self.doneParsing) {
                                return;
                            }
                            self.totalParsed++;

                            if (self.totalParsed > self.stopAt) {
                                self.doneParsing = true;
                                emit(buffer);
                                buffer = [];
                                liner.close();
                            } else {
                                if (result[1]) {
                                    buffer.push(result[0]);
                                } else {
                                    self.emit('error', errors.runtimeError('INTERNAL-ERROR',{
                                        error: 'Skipping line "' + line + '", due to: not matching pattern'
                                    }));
                                }
                                maybeFlush();
                            }
                        })
                        .catch(function(err) {
                            self.emit('error', errors.runtimeError('INTERNAL-ERROR',{
                                error: 'Skipping line "' + line + '", due to: ' + err.toString()
                            }));
                        });
                    });
                });

                liner.on('close', function() {
                    currentPromise.then(function() {
                        emit(buffer);
                        buffer = [];
                        resolve();
                    });
                });
            });
        });
    }
}

module.exports = GrokParser;

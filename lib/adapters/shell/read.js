'use strict';
/* eslint-env node */
var _ = require('underscore');
var AdapterRead = require('../adapter-read');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var spawn = require('child_process').spawn;
var parsers = require('../parsers');
var errors = require('../../errors');

var MemoryStream = require('memorystream');

class Iterator {
    constructor(adapter, from, to) {
        this.logger = adapter.logger;

        var stream = adapter.spawnChild();
        this.adapter = adapter;
        this.buffer = [];
        this.eof = false;
        this.error = null;
        this.pending = null;

        adapter.parser.parseStream(stream, (points) => {
            points = adapter.parseTime(points, { timeField: adapter.timeField });
            points = adapter.filterPoints(points, from, to);

            this.logger.debug('parsed', points.length, 'points');
            this.buffer = this.buffer.concat(points);

            // go back to the event loop once before notifying out a response to
            // avoid returning from read once for the last batch of points and
            // then again once the parser promise resolves
            setTimeout(() => { this.notify(); }, 0);
        })
        .then(() => {
            this.eof = true;
            this.notify();
        })
        .catch((err) => {
            this.error = err;
            this.notify();
        });
    }

    read(from, to, limit, state) {
        return new Promise((resolve, reject) => {
            this.pending = {
                resolve, reject
            };

            if (this.error || this.buffer.length !== 0 || this.eof) {
                this.resolve();
            }
        });
    }

    notify() {
        if (this.pending) {
            this.resolve();
        }
    }

    resolve() {
        this.logger.debug('resolve: err:', this.error,
                          'buffer:', this.buffer.length, 'eof:', this.eof);
        var pending = this.pending;
        this.pending = null;

        if (this.error) {
            pending.reject(this.error);
        } else {
            var points = this.buffer;
            this.buffer = [];
            pending.resolve({
                points: points,
                eof: this.eof,
                state: this
            });
        }
    }
}

class ReadShell extends AdapterRead {
    constructor(options, params) {
        super(options, params);

        this.timeField = options.timeField;

        this.format = options.format ? options.format : 'json'; // default to json
        var optimization_info = params && params.optimization_info || {};
        this.parser = parsers.getParser(this.format, _.extend({
            optimization: optimization_info
        }, options));

        this.parser
        .on('error', (err) => {
            this.trigger('error', new errors.runtimeError('INTERNAL-ERROR', {
                error: err.toString()
            }));
        });

        if (params.filter_ast) {
            throw new errors.compileError('ADAPTER-UNSUPPORTED-FILTER', {
                proc: 'read shell',
                filter: 'filtering'
            });
        }

        this.command = options.command;
        this.args = options.args || [];
        this.points = [];
        this.to = options.to;
    }

    defaultTimeOptions() {
        return {
            from: new JuttleMoment(0),
            to: new JuttleMoment(Infinity),
            every: JuttleMoment.duration(5, 's')
        };
    }

    periodicLiveRead() { 
        return true;
    }

    static allowedOptions() {
        return AdapterRead.commonOptions().concat([
            'command',
            'args',
            'timeField',
            'format',
            'pattern',
            'separator'
        ]);
    }
    
    spawnChild() { 
        // since the spawned process is completely external then we have to 
        // immediately listen on the stdout otherwise it will start receiving
        // data before we hook up the event listeners
        var child = spawn(this.command, this.args);
        var memStream = new MemoryStream();

        child.stdout.on('data', (data) => {
            memStream.write(data);
        });
        
        child.stdout.on('end', (data) => {
            memStream.end(data);
        });

        child.on('exit', (code, signal) => {
            if (code !== null && code !== 0) {
                this.trigger('error', new errors.runtimeError('INTERNAL-ERROR', {
                    error: `process exited with exit code: ${code}`
                }));
            }

            if (signal !== null) { 
                this.trigger('error', new errors.runtimeError('INTERNAL-ERROR', {
                    error: `process terminated with singal: ${signal}`
                }));
            }
        });

        return memStream;
    }

    read(from, to, limit, iterator) {
        var getIterator = iterator
            ? Promise.resolve(iterator)
            : Promise.try(() => { return new Iterator(this, from, to); });

        return getIterator
        .then((iterator) => {
            return iterator.read(from, to, limit);
        })
        .then((result) => {
            if (result.eof && this.to !== undefined) { 
                // force a rerun
                result.eof = false;
                result.state = undefined;
                result.readEnd = to;
            }
            return result;
        });
    }
}

module.exports = ReadShell;

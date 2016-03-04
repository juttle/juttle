'use strict';

var _ = require('underscore');
var fs = require('fs');
var AdapterRead = require('../adapter-read');
var parsers = require('../parsers');
var JuttleMoment = require('../../runtime/types/juttle-moment');
var errors = require('../../errors');

class Iterator {
    constructor(adapter, from, to) {
        this.logger = adapter.logger;

        var stream = adapter.fetch();
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

class ReadFile extends AdapterRead {
    constructor(options, params) {
        super(options, params);

        this.filename = options.file;
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
                proc: 'read file',
                filter: 'filtering'
            });
        }
    }

    // Override the default time range to make sure it's set when calling
    // into read.
    defaultTimeOptions() {
        return {
            from: new JuttleMoment(0),
            to: new JuttleMoment(Infinity)
        };
    }

    static allowedOptions() {
        return AdapterRead.commonOptions().concat(['file', 'format', 'pattern']);
    }

    static requiredOptions() {
        return ['file'];
    }

    // do not remove as this is used by lib/runtime/specs/juttle-test-utils
    fetch() {
        return fs.createReadStream(this.filename, { encoding: 'utf8' });
    }

    read(from, to, limit, state) {
        if (!state) {
            state = new Iterator(this, from, to);
        }
        return state.read(from, to, limit);
    }
}

module.exports = ReadFile;

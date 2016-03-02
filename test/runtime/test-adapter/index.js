//
// Fake adapter used for testing that implements read and write.
//
// Both take a --key argument that is an index into an in-memory
// table. All points written to the table in a given key can be
// read back using the same key.
//
'use strict';

var _ = require('underscore');
var store = {};
/* globals JuttleAdapterAPI */
var AdapterRead = JuttleAdapterAPI.AdapterRead;
var AdapterWrite = JuttleAdapterAPI.AdapterWrite;
var JuttleMoment = require('../../../lib/runtime/types/juttle-moment');

function TestAdapter(config) {
    class Read extends AdapterRead {
        constructor(options, params) {
            super(options, params);
            this.logger.debug('initialize options:', options);
            this.debug = options.debug;
            this.key = options.key;
            if (!this.debug && !this.key) {
                throw this.compileError('MISSING-OPTION', {
                    proc: 'read test',
                    option: 'key'
                });
            }

            this._setup_optimization(params);
        }

        static allowedOptions() {
            return AdapterRead.commonOptions().concat(['debug', 'key', 'optimize']);
        }

        _setup_optimization(params) {
            var optimization_info = params.optimization_info;
            if (!optimization_info) {
                return;
            }
            this.optimization_info = params.optimization_info;

            if (optimization_info.count) {
                this.count = optimization_info.count;
            } else if (optimization_info.count_every) {
                this.count_every = JuttleMoment.duration(optimization_info.count_every.value);
            }
            if (optimization_info.hasOwnProperty('limit')) {
                this.limit = optimization_info.limit;
            }
        }

        read(from, to, limit, state) {
            var points;

            // If invoked with -debug 'optimization', then instead of emitting
            // points, emit the optimization info that was passed in from the
            // compiler.
            if (this.debug === 'optimization') {
                this.logger.debug('debug mode: optimization');
                points = [this.optimization_info || {}];
            }
            // If invoked with -debug 'timeBounds', then instead of emitting
            // points, emit the -from and -to time options.
            else if (this.debug === 'timeBounds') {
                this.logger.debug('debug mode: timeBounds');
                points = [{
                    from: from ? from.toJSON() : '(null)',
                    to: to ? to.toJSON() : '(null)'
                }];
            }
            // Otherwise just emit whatever is stored for the given key
            else {
                points = store[this.key] || [];
            }

            if (this.hasOwnProperty('limit')) {
                points = points.slice(0, this.limit);
            }

            if (this.count) {
                points = [{count: points.length}];
            } else if (this.count_every) {
                points = _.chain(points).groupBy((pt) => {
                    return pt.time.quantize(this.count_every).milliseconds();
                })
                .map((pts) => {
                    return {count: pts.length, time: pts[0].time};
                })
                .sortBy(function(pt) {
                    return pt.time.milliseconds();
                }).value();
            }

            return Promise.resolve({
                points: points,
                eof: true
            });
        }
    }

    var optimizer = {
        optimize_head: function(read, head, graph, optimization_info) {
            if (optimization_info.type && optimization_info.type !== 'head') {
                return false;
            }

            var limit = graph.node_get_option(head, 'arg');

            if (optimization_info.hasOwnProperty('limit')) {
                limit = Math.min(limit, optimization_info.limit);
            }

            optimization_info.type = 'head';
            optimization_info.limit = limit;
            return true;
        },
        optimize_tail: function(read, tail, graph, optimization_info) {
            if (optimization_info.type && optimization_info.type !== 'tail') {
                return false;
            }

            var limit = graph.node_get_option(tail, 'arg');

            if (optimization_info.hasOwnProperty('limit')) {
                limit = Math.min(limit, optimization_info.limit);
            }

            optimization_info.type = 'tail';
            optimization_info.limit = limit;
            return true;
        },
        optimize_reduce: function(read, reduce, graph, optimization_info) {
            var reduce_is_count = reduce && reduce.reducers &&
                reduce.reducers.length === 1 && reduce.reducers[0].name === 'count' &&
                reduce.reducers[0].arguments.length === 0 && !reduce.groupby;

            if (!reduce_is_count) {
                return;
            }

            var every = _.findWhere(reduce.options, {id: 'every'});

            if (every) {
                optimization_info.count_every = every.val;
            } else {
                optimization_info.count = true;
            }

            return true;
        }
    };

    class Write extends AdapterWrite {
        constructor(options, params) {
            super(options, params);
            this.key = options.key;
            if (! this.key) {
                throw this.compileError('MISSING-OPTION', {
                    proc: 'write test',
                    option: 'key'
                });
            }
        }

        static allowedOptions() {
            return ['key'];
        }

        write(points) {
            this.logger.debug('write', this.key, points);
            var data = store[this.key] || [];
            data = data.concat(points);
            store[this.key] = data;
        }

        eof() {
            return Promise.resolve();
        }
    }

    return {
        name: 'test',
        read: Read,
        write: Write,
        optimizer: optimizer
    };
}

module.exports = TestAdapter;

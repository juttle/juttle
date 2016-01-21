//
// Fake adapter used for testing that implements read and write.
//
// Both take a --key argument that is an index into an in-memory
// table. All points written to the table in a given key can be
// read back using the same key.
//

var _ = require('underscore');
var store = {};
var Juttle = require('../../lib/runtime/index').Juttle;

function TestAdapter(config) {
    var Read = Juttle.proc.source.extend({
        procName: 'read-test',

        initialize: function(options, params) {
            var defaultTimeRange = config.defaultTimeRange || this.DEFAULT_TIME_RANGE.INFINITE;
            this.handleTimeOptions(options, defaultTimeRange);

            this.logger.debug('initialize options:', options, 'params:', params);

            // If invoked with -debug 'optimization', then instead of emitting
            // points, emit the optimization info that was passed in from the
            // compiler.
            if (options.debug && options.debug === 'optimization') {
                this.logger.debug('debug mode: optimization');
                this.debug_info = params.optimization_info || {};
                return;
            }

            // If invoked with -debug 'timeBounds', then instead of emitting
            // points, emit the -from and -to time options.
            if (options.debug && options.debug === 'timeBounds') {
                this.logger.debug('debug mode: timeBounds')
                this.debug_info = {from: this.from.toJSON(), to: this.to.toJSON()};
                return;
            }

            this.key = options.key;
            if (!this.key) {
                throw this.compile_error('RT-REQUIRED-OPTION-ERROR', {
                    proc: 'read test',
                    option: 'key'
                });
            }

            this._setup_optimization(params);
        },

        _setup_optimization: function(params) {
            var optimization_info = params.optimization_info;
            if (!optimization_info) {
                return;
            }

            this.count = optimization_info.count;
            if (optimization_info.hasOwnProperty('limit')) {
                this.limit = optimization_info.limit;
            }
        },

        start: function() {
            var points;
            if (this.debug_info) {
                points = [this.debug_info];
            } else {
                points = store[this.key] || [];
            }

            if (this.hasOwnProperty('limit')) {
                points = points.slice(0, this.limit);
            }

            if (this.count) {
                points = [{count: points.length}];
            }

            this.emit(points);
            this.eof();
        }
    });

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
                reduce.reducers[0].arguments.length === 0 && !reduce.groupby &&
                !_.findWhere(reduce.options, {id: 'every'});

            if (reduce_is_count) {
                optimization_info.count = true;
                return true;
            }
        }
    };

    var Write = Juttle.proc.sink.extend({
        procName: 'write-test',
        initialize: function(options, params) {
            this.key = options.key;
            this.name = 'write-test';
            if (!this.key) {
                throw this.compile_error('RT-REQUIRED-OPTION-ERROR', {
                    proc: 'write test',
                    option: 'key'
                });
            }
        },

        process: function(points) {
            var data = store[this.key] || [];
            data = data.concat(points);
            store[this.key] = data;
        },

        eof: function() {
            this.done();
        }
    });

    return {
        name: 'test',
        read: Read,
        write: Write,
        optimizer: optimizer
    };
}

module.exports = TestAdapter;

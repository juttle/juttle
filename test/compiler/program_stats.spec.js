var expect = require('chai').expect;
var compiler = require('../../lib/compiler');
var prog_stats = require('../../lib/compiler/flowgraph/program_stats.js');
var _ = require('underscore');

describe('Program instrumentation', function() {

    function test(juttle, spec) {
        it(juttle, function() {
            var program = compiler.compileSync(juttle, {
                stage: 'flowgraph',
                modules: { 'm.juttle': 'export const a = 1;' }
            });
            var stats = prog_stats(program);

            expect(_.omit(stats, 'sources')).to.deep.equal(_.omit(spec, 'sources'));

            // check 'sources' separately because it contains moments
            expect(JSON.stringify(stats.sources)).to.equal(JSON.stringify(spec.sources));
        });
    }

    var from = '2015-01-01T00:00:00.000Z';
    var to = '2015-02-02T00:00:00.000Z';
    var last = '01:00:00.000';

    test('read stochastic -source "cdn" | view view ', {
        inputs: {},
        input_total: 0,
        source_total: 1,
        sources: [{type: 'read', from: null, to: null, last: null}],
        procs: {
            read: 1
        },
        proc_total: 1,
        sinks: {
            view: 1
        },
        sink_total: 1,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });
    test('(emit; read http "http://bla.com") | view view ', {
        inputs: {},
        input_total: 0,
        source_total: 2,
        sources: [{type: 'emit'},
                  {type: 'read', from: null, to: null, last: null}],
        procs: {
            emit: 1,
            read: 1
        },
        proc_total: 2,
        sinks: {
            view: 1
        },
        sink_total: 1,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });

    test('read stochastic -source "cdn" -from :' + from + ': | view view ', {
        inputs: {},
        input_total: 0,
        source_total: 1,
        sources: [{type: 'read', from: from, to: null, last: null}],
        sinks: {
            view: 1
        },
        sink_total: 1,
        procs: {
            read: 1
        },
        proc_total: 1,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });
    test('read stochastic -source "cdn" -from :' + from + ': -to :' + to + ': | view view ', {
        inputs: {},
        input_total: 0,
        source_total: 1,
        sources: [{type: 'read', from: from, to: to, last: null}],
        sinks: {
            view: 1
        },
        sink_total: 1,
        procs: {
            read: 1
        },
        proc_total: 1,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });
    test('read stochastic -last :' + last + ': -source "cdn" | view view ', {
        inputs: {},
        input_total: 0,
        source_total: 1,
        sources: [{type: 'read', from: null, to: null, last: last}],
        procs: {
            read: 1
        },
        proc_total: 1,
        sinks: {
            view: 1
        },
        sink_total: 1,
        reducer_total: 0,
        reducers: {},
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });
    test('read stochastic -source "cdn" -from :' + from + ': | view view; read stochastic -last :' + last + ': -source "cdn"  | view view ', {
        inputs: {},
        input_total: 0,
        source_total: 2,
        sources: [
            {type: 'read', from: from, to: null, last: null},
            {type: 'read', from: null, to: null, last: last}
        ],
        sinks: {
            view: 2
        },
        sink_total: 2,
        procs: {
            read: 2
        },
        proc_total: 2,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });
    test('(read stochastic -source "cdn" -from :' + from + ':; read stochastic -last :' + last + ': -source "cdn" ) | view view ', {
        inputs: {},
        input_total: 0,
        source_total: 2,
        sources: [
            {type: 'read', from: from, to: null, last: null},
            {type: 'read', from: null, to: null, last: last}
        ],
        sinks: {
            view: 1
        },
        sink_total: 1,
        procs: {
            read: 2
        },
        proc_total: 2,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });
    test('read stochastic -source "cdn"' +
         '| reduce m=min(a), avg(c), count(), percentile(p), first(a), first(b),last(b) | view view ', {
             inputs: {},
             input_total: 0,
             source_total: 1,
             sources: [{type: 'read', from: null, to: null, last: null}],
             sinks: {
                 view: 1
             },
             sink_total: 1,
             procs: {
                 read: 1,
                 reduce: 1
             },
             proc_total: 2,
             reducers: {
                 min: 1,
                 avg: 1,
                 count: 1,
                 percentile: 1,
                 first: 2,
                 last: 1
             },
             reducer_total: 7,
             functions: {'user-defined' : 0},
             subs: 0,
             imports: 0
         });

    test('reducer bla() { function update() { } function result() {}} ' +
         'sub s() {read stochastic -source "cdn" | (reduce bla(); reduce bla(), max(m))} s | (view view; view table) ', {
             inputs: {},
             input_total: 0,
             source_total: 1,
             sources: [{type: 'read', from: null, to: null, last: null}],
             sinks: {
                 table: 1,
                 view: 1
             },
             sink_total: 2,
             procs: {
                 read: 1,
                 reduce: 2
             },
             proc_total: 3,
             reducers: {
                 'user-defined': 2,
                 max: 1
             },
             reducer_total: 3,
             functions: {'user-defined': 0},
             subs: 1,
             imports: 0
         });

    test('function f() { return 1;} function g() { return "fieldname";} ' +
         'emit | put a = f(), b = g() | view view ', {
             inputs: {},
             input_total: 0,
             source_total: 1,
             sources: [{type: 'emit'}],
             sinks: {
                 view: 1
             },
             sink_total: 1,
             procs: {
                 emit: 1,
                 put: 1
             },
             proc_total: 2,
             reducers: {},
             reducer_total: 0,
             functions: {'user-defined': 2},
             subs: 0,
             imports: 0
         });

    test('import "m.juttle" as m; emit | view view', {
        inputs: {},
        input_total: 0,
        source_total: 1,
        sources: [{type: 'emit'}],
        sinks: {
            view: 1
        },
        sink_total: 1,
        procs: {
            emit: 1
        },
        proc_total: 1,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined' : 0},
        subs: 0,
        imports: 1
    });

    test('input a: text -default ""; input b: dropdown -default ""; emit | view view', {
        inputs: {
            text: 1,
            dropdown: 1
        },
        input_total: 2,
        source_total: 1,
        sources: [{type: 'emit'}],
        sinks: {
            view: 1
        },
        sink_total: 1,
        procs: {
            emit: 1
        },
        proc_total: 1,
        reducers: {},
        reducer_total: 0,
        functions: {'user-defined': 0},
        subs: 0,
        imports: 0
    });
});

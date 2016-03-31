'use strict';

var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var run_juttle = juttle_test_utils.run_juttle;
var _ = require('underscore');
var compiler = require('../../lib/compiler');
var optimize = require('../../lib/compiler/optimize');
var FlowControl = require('../../lib/runtime/flow-control');


describe('Graph API', function() {

    function make_graph(juttle) {
        // we want to compile with just optimization and verify the resulting
        // graph in the tests below
        return compiler.compileSync(juttle, { stage: 'flowgraph', fg_processors: [optimize] });
    }

    function compile(juttle, processor) {
        return compiler.compileSync(juttle, { fg_processors: [processor], flow_control: new FlowControl() });
    }

    describe('get_roots()', function() {
        function test(juttle, roots) {
            var graph = make_graph(juttle);
            var roots_ = _.pluck(graph.get_roots(), 'name');
            expect(roots_.sort()).deep.equal(roots.sort());
        }
        it('A', function() {
            test('emit', ['emit']);
        });
        it('A | B', function() {
            test('emit | unbatch', ['emit']);
        });
        it('A; B', function() {
            test('emit ; read test', ['emit', 'read']);
        });
        it('(A; B) | C', function() {
            test('(emit; read test) | unbatch', ['emit', 'read']);
        });
    });

    describe('get_leaves()', function() {

        function test(juttle, leaves) {
            var graph = make_graph(juttle);
            var leaves_ = _.pluck(graph.get_leaves(), 'name');
            expect(leaves_.sort()).deep.equal(leaves.sort());
        }
        it('A', function() {
            test('emit', ['emit']);
        });
        it('A | B', function() {
            test('emit | unbatch', ['unbatch']);
        });
        it('A; B', function() {
            test('emit ; read test', ['emit', 'read']);
        });
        it('A | (B; C)', function() {
            test('emit | (unbatch; pass)', ['unbatch', 'pass']);
        });
    });

    describe('node_get_inputs()', function() {


        function test(juttle, inputs) {
            var graph = make_graph(juttle);
            var leaves_ = _.map(graph.get_leaves());
            var inputs_ = _.map(leaves_, function(leaf) {
                return _.pluck(graph.node_get_inputs(leaf), 'name');
            });
            expect(inputs_.sort()).deep.equal(inputs.sort());
        }
        it('A', function() {
            test('emit', [[]]);
        });
        it('A | B', function() {
            test('emit | unbatch', [['emit']]);
        });
        it('A; B', function() {
            test('emit ; read test', [[], []]);
        });
        it('A | (B; C)', function() {
            test('emit | (unbatch; pass)', [['emit'], ['emit']]);
        });
        it('(A; B) | (C; D)', function() {
            test('(emit; read test) | (unbatch; pass)', [['emit', 'read'], ['emit', 'read']]);
        });
    });

    describe('node_get_outputs()', function() {

        function test(juttle, outputs) {
            var graph = make_graph(juttle);
            var roots_ = _.map(graph.get_roots());
            var outputs_ = _.map(roots_, function(root) {
                return _.pluck(graph.node_get_outputs(root), 'name');
            });
            expect(outputs_.sort()).deep.equal(outputs.sort());
        }
        it('A', function() {
            test('emit', [[]]);
        });
        it('A | B', function() {
            test('emit | unbatch', [['unbatch']]);
        });
        it('A; B', function() {
            test('emit ; read test', [[], []]);
        });
        it('A | (B; C)', function() {
            test('emit | (unbatch; pass)', [['unbatch', 'pass']]);
        });
        it('(A; B) | (C; D)', function() {
            test('(emit; emit) | (unbatch; pass)', [['unbatch', 'pass'], ['unbatch', 'pass']]);
        });
    });

    describe('node_set_option()', function() {

        it('set "-limit 1" on emit', function() {
            var graph = make_graph('emit -hz 1000 | view result');
            var emit = graph.get_roots()[0];
            graph.node_set_option(emit, 'limit', 1);
            var limit = graph.node_get_option(emit, 'limit');
            expect(limit).to.equal(1);
        });
        it('set "-limit 1" on emit (override)', function() {
            var graph = make_graph('emit -hz 1000 -limit 5 | view result');
            var emit = graph.get_roots()[0];
            graph.node_set_option(emit, 'limit', 1);
            var limit = graph.node_get_option(emit, 'limit');
            expect(limit).to.equal(1);
        });
    });

    describe('node_get_option()/node_has_option()', function() {

        it('limit on head exists', function() {
            var graph = make_graph('const a=1, b=0; emit -hz 1000 | head [a][b]');
            var head = graph.get_leaves()[0];
            var has = graph.node_has_option(head, 'arg');
            expect(has).to.equal(true);
        });

        it('groupby on head exists', function() {
            var graph = make_graph('const a=1, b=0; emit -hz 1000 | head [a][b] by bla');
            var head = graph.get_leaves()[0];
            var has = graph.node_has_option(head, 'groupby');
            expect(has).to.equal(true);
        });

        it('groupby on head does not exist', function() {
            var graph = make_graph('const a=1, b=0; emit -hz 1000 | head [a][b]');
            var head = graph.get_leaves()[0];
            var has = graph.node_has_option(head, 'groupby');
            expect(has).to.equal(false);
        });

        it('get numeric option', function() {
            var graph = make_graph('const a=1, b=0; emit -hz 1000 | head [a][b]');
            var head = graph.get_leaves()[0];
            var limit = graph.node_get_option(head, 'arg');
            expect(limit).to.equal(1);
        });

        it('get array option', function() {
            var graph = make_graph('emit -hz 1000 | head 1 by a, b, c');
            var head = graph.get_leaves()[0];
            var groupby = graph.node_get_option(head, 'groupby');
            expect(groupby).deep.equal(['a', 'b', 'c']);
        });

        it('get object option', function() {
            var graph = make_graph('emit -hz 1000 -foo {a: 1, b: "bla"}');
            var emit = graph.get_roots()[0];
            var foo = graph.node_get_option(emit, 'foo');
            expect(foo).deep.equal({a: 1, b: 'bla'});
        });
    });

    describe('add_edge()', function() {

        it('A | B; C | D, add edge D-B to build (A; C|D)|B', function() {
            var program = compile('emit -from Date.new(0) -limit 1 | view result; emit -from :0: -limit 1 | put a = 1;', function(graph) {
                var put = _.findWhere(graph.get_leaves(), {type: 'PutProc'});
                var sink = _.findWhere(graph.get_leaves(), {type: 'View'});
                graph.add_edge(put, sink);
            });
            return run_juttle(program).then(function(res) {
                expect(res.sinks.result.sort()).deep.equal([
                    { time: '1970-01-01T00:00:00.000Z' }, { time: '1970-01-01T00:00:00.000Z', a: 1 }
                ].sort());
            });
        });
    });

    describe('remove_edge()', function() {
        it('(A;B)|C, remove edge B-C to build A | C ; B ', function() {
            var program = compile('(emit -from Date.new(0) -limit 1 ; emit -from Date.new(0) -limit 1 | put a = 1)| view result ', function(graph) {
                var put = _.findWhere(graph.get_nodes(), {type: 'PutProc'});
                var sink = _.findWhere(graph.get_leaves(), {type: 'View'});
                graph.remove_edge(put, sink);
                // add a new sink just so that it doesn't complain about
                graph.add_edge(put, graph.add_node('View', 'newView'));
            });
            return run_juttle(program).then(function(res) {
                expect(res.sinks.result.sort()).deep.equal([
                    { time: '1970-01-01T00:00:00.000Z' }
                ].sort());
            });
        });
    });

    describe('swap_neighbors()', function() {
        it('swap nodes', function() {
            var program = compile('emit -from Date.new(0) -limit 1 | put v = 1 | remove v | view result', function(graph) {
                var put = _.findWhere(graph.get_nodes(), {type: 'PutProc'});
                var remove = _.findWhere(graph.get_nodes(), {name: 'remove'});
                graph.swap_neighbors(put, remove);
            });
            return run_juttle(program).then(function(res) {
                expect(res.sinks.result.sort()).deep.equal([
                    { time: '1970-01-01T00:00:00.000Z', v: 1 }
                ].sort());
            });
        });
    });

    describe('add_shortcut()', function() {
        it('A | B | C, shortcut A - C', function() {
            var program = compile('emit -from Date.new(0) -limit 1 | put a = "does not appear" | view result', function(graph) {
                var emit = graph.get_roots()[0];
                var put = graph.node_get_outputs(emit)[0];
                var sink = graph.get_leaves()[0];
                graph.node_set_option(emit, '_output', 's1');
                graph.add_shortcut(emit, put, sink, 's1');
            });
            return run_juttle(program).then(function(res) {
                expect(res.sinks.result).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
            });
        });
        it('A | B | (C; D), shortcut A - (C; D)', function() {
            var program = compile('emit -from Date.new(0) -limit 1 | put a = "does not appear" | (view result1; view result2)', function(graph) {
                var emit = graph.get_roots()[0];
                var put = graph.node_get_outputs(emit)[0];
                var sinks = graph.get_leaves();
                graph.add_shortcut(emit, put, sinks[0], 's1');
                graph.add_shortcut(emit, put, sinks[1], 's1');
                graph.node_set_option(emit, '_output', 's1');
            });
            return run_juttle(program).then(function(res) {
                expect(res.sinks.result1).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
                expect(res.sinks.result2).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
            });
        });
        it('Rejects invalid shortcut due to bad pair', function() {
            compile('emit -from Date.new(0) -limit 1 | put a = "does not appear" | view result', function(graph) {
                var emit = graph.get_roots()[0];
                var sink = graph.get_leaves()[0];
                try {
                    graph.add_shortcut(emit, emit, sink, 's1');
                } catch (e) {
                    expect(e.message).to.match(/invalid shortcut/i);
                    return;
                }
                throw new Error('Should reject invalid shortcut');
            });
        });
        it('Rejects invalid shortcut due to existing edge', function() {
            compile('emit -from Date.new(0) -limit 1 | put a = "does not appear" | view result', function(graph) {
                var emit = graph.get_roots()[0];
                var put = graph.node_get_outputs(emit)[0];
                try {
                    graph.add_shortcut(emit, emit, put, 's1');
                } catch (e) {
                    expect(e.message).to.match(/invalid shortcut/i);
                    return;
                }
                throw new Error('Should reject invalid shortcut');
            });
        });
    });
});

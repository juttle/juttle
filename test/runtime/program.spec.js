var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var run_juttle = juttle_test_utils.run_juttle;
var compiler = require('../../lib/compiler');


describe('Program', function() {

    function compile(juttle, processor) {
        return compiler.compileSync(juttle, { fg_processors: [processor] });
    }

    describe('get_stats()', function() {
        it('emit -limit 1 | view sink', function() {
            var emit, sink;
            var program = compile('emit -from Date.new(0) -limit 1 | view result;', function(graph) {
                emit = graph.get_roots()[0];
                sink = graph.get_leaves()[0];
            });
            return run_juttle(program).then(function(res) {
                expect (program.get_stats(emit)).deep.equal({points_in: 0, points_out: 1});
                expect (program.get_stats(sink)).deep.equal({points_in: 1, points_out: 0});
            });
        });
        it('emit -limit 5 -from Date.new(0) | put count() | view sink', function() {
            var emit, reduce, sink;
            var program = compile('emit -limit 5 -from Date.new(0) | reduce count() | view sink', function(graph) {
                emit = graph.get_roots()[0];
                reduce = graph.node_get_outputs(emit)[0];
                sink = graph.get_leaves()[0];
            });
            return run_juttle(program).then(function(res) {
                expect (program.get_stats(emit)).deep.equal({points_in: 0, points_out: 5});
                expect (program.get_stats(reduce)).deep.equal({points_in: 5, points_out: 1});
                expect (program.get_stats(sink)).deep.equal({points_in: 1, points_out: 0});
            });
        });
        it('(emit -limit 5; emit -limit 5) | (view sink0; view sink1)', function() {
            var emit0, emit1, sink0, sink1;
            var program = compile('(emit -limit 5 -from Date.new(0); emit -limit 5 -from :0:) | (view sink0; view sink1)', function(graph) {
                emit0 = graph.get_roots()[0];
                emit1 = graph.get_roots()[1];
                sink0 = graph.get_leaves()[0];
                sink1 = graph.get_leaves()[1];
            });
            return run_juttle(program).then(function(res) {
                expect(program.get_stats(emit0)).deep.equal({points_in: 0, points_out: 5});
                expect(program.get_stats(emit1)).deep.equal({points_in: 0, points_out: 5});
                expect(program.get_stats(sink0)).deep.equal({points_in: 10, points_out: 0});
                expect(program.get_stats(sink1)).deep.equal({points_in: 10, points_out: 0});
            });
        });
    });
});

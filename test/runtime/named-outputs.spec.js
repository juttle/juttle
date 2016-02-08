'use strict';

var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var compile_juttle = juttle_test_utils.compile_juttle;
var run_juttle = juttle_test_utils.run_juttle;
var _ = require('underscore');


describe('Juttle named outputs', function() {
    it('Topology: A | B, Shortcut: A -> B ', function() {
        return compile_juttle({program: 'emit -from Date.new(0) -limit 1 -_output "s1" | view result'})
            .then(function(program) {
                var emit = program.get_sources()[0];
                var sink = program.get_sinks()[0];
                emit.shortcut(sink, emit, 's1');
                return program;
            }).then(function(program) {
                return run_juttle(program, {});
            }).then(function(res) {
                expect(res.sinks.result).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
            });
    });
    it('Topology: A | B | C, Shortcut: A -> C ', function() {
        return compile_juttle({program: 'emit -from Date.new(0) -limit 1 -_output "s1" | put a = "does not appear" | view result'})
            .then(function(program) {
                var emit = program.get_sources()[0];
                var sink = program.get_sinks()[0];
                var put = _.filter(program.get_nodes(), function(n) { return n.procName() === 'put'; })[0];
                emit.shortcut(sink, put, 's1');
                return program;
            }).then(function(program) {
                return run_juttle(program, {});
            }).then(function(res) {
                expect(res.sinks.result).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
            });
    });
    it('Topology: A | B | C, Shortcut: A -> C (verify eof bypasses B)', function() {
        return compile_juttle({program: 'emit -from Date.new(0) -limit 1 -_output "s1" | reduce count() | view result'})
            .then(function(program) {
                var emit = program.get_sources()[0];
                var sink = program.get_sinks()[0];
                var reduce = _.filter(program.get_nodes(), function(n) { return n.procName() === 'reduce'; })[0];
                emit.shortcut(sink, reduce, 's1');
                return program;
            }).then(function(program) {
                return run_juttle(program, {});
            }).then(function(res) {
                expect(res.sinks.result).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
            });
    });
    it('Topology: A | B | (C; D) , Shortcut: A -> C, A -> C (verify eof bypasses B)', function() {
        return compile_juttle({program: 'emit -from Date.new(0) -limit 1 -_output "s1" | reduce count() | (view result1; view result2)'})
            .then(function(program) {
                var emit = program.get_sources()[0];
                var sinks = program.get_sinks();
                var reduce = _.filter(program.get_nodes(), function(n) { return n.procName() === 'reduce'; })[0];
                emit.shortcut(sinks[0], reduce, 's1');
                emit.shortcut(sinks[1], reduce, 's1');
                return program;
            }).then(function(program) {
                return run_juttle(program, {});
            }).then(function(res) {
                expect(res.sinks.result1).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
                expect(res.sinks.result2).deep.equal([ { time: '1970-01-01T00:00:00.000Z' } ]);
            });
    });
});

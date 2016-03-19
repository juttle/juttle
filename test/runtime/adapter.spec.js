'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var path = require('path');
var _ = require('underscore');
var adapters = require('../../lib/runtime/adapters');
var TestAdapterClone = require('./test-adapter-clone');

describe('adapter API tests', function () {
    it('fails when you do not provide the `key` to read', function() {
        return check_juttle({
            program: 'read test'
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .then(function(result) {
            expect(result.errors).deep.equal([]);
            expect(result.sinks.table.length).equal(0);
        })
        .catch(function(err) {
            expect(err.message).to.equal('missing read test required option key.');
        });
    });

    it('fails when you do not provide the `key` to write', function() {
        return check_juttle({
            program: 'read test -key "test1" | write test'
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.message).to.equal('missing write test required option key.');
        });
    });

    it('reads no points initially', function() {
        return check_juttle({
            program: 'read test -key "test1"'
        })
        .then(function(result) {
            expect(result.errors).deep.equal([]);
            expect(result.sinks.table).deep.equal([]);
        });
    });

    it('can write a point and read it back', function() {
        return check_juttle({
            program: 'emit -limit 1 | put message = "hello test" | write test -key "test2"'
        })
        .then(function(result) {
            expect(result.errors).deep.equal([]);
        })
        .then(function() {
            return check_juttle({
                program: 'read test -key "test2"'
            });
        })
        .then(function(result) {
            expect(result.errors).deep.equal([]);
            expect(result.sinks.table.length).equal(1);
            expect(result.sinks.table[0].message).equal('hello test');
        });
    });

    it('can write two points and read them back again', function() {
        return check_juttle({
            program: 'emit -limit 1 | put message = "hello test 2" | write test -key "test3"'
        })
        .then(function(result) {
            expect(result.errors).deep.equals([]);
        })
        .then(function() {
            return check_juttle({
                program: 'emit -limit 1 | put message = "hello again" | write test -key "test3"'
            });
        })
        .then(function() {
            return check_juttle({
                program: 'read test -key "test3"'
            });
        })
        .then(function(result) {
            expect(result.errors).deep.equal([]);
            expect(result.sinks.table.length).equal(2);
            expect(result.sinks.table[0].message).equal('hello test 2');
            expect(result.sinks.table[1].message).equal('hello again');
        });
    });

    it('optimizes reduce', function() {
        var program = 'read test -key "test2" | reduce count()';
        return check_juttle({
            program: program
        })
        .then(function(result) {
            var first_node = result.prog.graph.head[0];
            expect(first_node.procName()).equal('read-test');

            var second_node = first_node.out_.default[0].proc;
            expect(second_node.procName()).equal('view');
            expect(result.sinks.table).deep.equal([{count: 1}]);
            expect(result.prog.graph.adapter.count).equal(true);
        });
    });

    it('optimizes multiple nodes', function() {
        var program = 'read test -key "test3" | head 4 | head 3 | head 1';
        return check_juttle({
            program: program
        })
        .then(function(result) {
            expect(result.sinks.table.length).equal(1);
            expect(result.prog.graph.adapter.limit).equal(1);
        });
    });

    it('optimizes head | reduce', function() {
        var program = 'read test -key "test3" | head 1 | reduce count()';
        return check_juttle({
            program: program
        })
        .then(function(result) {
            var first_node = result.prog.graph.head[0];
            expect(first_node.procName()).equal('read-test');

            var second_node = first_node.out_.default[0].proc;
            expect(second_node.procName()).equal('view');

            expect(result.sinks.table).deep.equal([{count: 1}]);
            expect(result.prog.graph.adapter.limit).equal(1);
            expect(result.prog.graph.adapter.count).equal(true);
        });
    });
    
    it('optimizes sort', function() {
        var write_program = `
            const points = [
                {code: 5},
                {code : 8},
                {code: 2},
                {code: 2},
                {code: 9},
            ];
            emit -points points
            | write test -key "test_sort"`;
            
        var unsortedResult;

        return check_juttle({program: write_program})
            .then(function() {
                var read_program_unsorted = 'read test -key "test_sort"';
                return check_juttle({program: read_program_unsorted});
            })
            .then(function(result) {
                unsortedResult = result.sinks.table;
                expect(unsortedResult).to.have.length(5);
                expect(unsortedResult[0].code).to.equal(5);
                
                var read_program_sorted = `
                    read test -key "test_sort"
                        | sort code`;
                return check_juttle({program: read_program_sorted});
            })
            .then(function(result) {
                var optimization_info = result.prog.graph.adapter.optimization_info;
                expect(optimization_info).to.eql({
                    sort: 'code'
                });
                
                var sortedResult = result.sinks.table;
                expect(sortedResult).to.not.deep.equal(unsortedResult);
                
                expect(sortedResult).to.deep.equal(_.sortBy(unsortedResult, 'code'));
            });
    });

    it('delays loading of configured adapters', function() {
        adapters.configure({
            'testClone': {
                path: path.resolve(__dirname, './test-adapter-clone')
            }
        });

        expect(TestAdapterClone.initialized).is.false;

        var program = 'read testClone -from :0: -key "test"';
        return check_juttle({
            program: program
        })
        .then(function(result) {
            expect(TestAdapterClone.initialized).is.true;
            expect(result.errors).deep.equals([]);
            expect(result.sinks.table.length).equal(0);
        });
    });

    it('errors if a bogus adapter is used in read', function() {
        return check_juttle({
            program: 'read bogus'
        })
        .then(function() {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.code).equal('INVALID-ADAPTER');
            expect(err.message).equal('adapter bogus not registered');
            expect(err.info.location.filename).is.a.string;
            expect(err.info.location.start.offset).is.a.number;
            expect(err.info.location.end.offset).is.a.number;
        });
    });

    it('errors if a bogus adapter is used in write', function() {
        return check_juttle({
            program: 'emit | write bogus'
        })
        .then(function() {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.code).equal('INVALID-ADAPTER');
            expect(err.message).equal('adapter bogus not registered');
            expect(err.info.location.filename).is.a.string;
            expect(err.info.location.start.offset).is.a.number;
            expect(err.info.location.end.offset).is.a.number;
        });
    });

    it('errors if an incompatible adapter is used in read', function() {
        adapters.configure({
            'testIncompatible': {
                path: path.resolve(__dirname, './test-adapter-incompatible')
            }
        });

        return check_juttle({
            program: 'read testIncompatible'
        })
        .then(function() {
            throw new Error('unexpected success');
        })
        .catch(function(err) {
            expect(err.message).match(/adapter testIncompatible incompatible with juttle \d+\.\d+\.\d+ \(wanted \^999.0.0\)/);
            expect(err.code).equal('INCOMPATIBLE-ADAPTER');
            expect(err.info.location.filename).is.a.string;
            expect(err.info.location.start.offset).is.a.number;
            expect(err.info.location.end.offset).is.a.number;
        });
    });

    it('defaults to undefined for -from and -to', function() {
        return check_juttle({
            program: 'read test -debug "timeBounds" -key "bananas"'
        })
        .then(function(result) {
            expect(result.errors).deep.equal([]);

            var expected = [{from: '(null)', to: '(null)'}];
            expect(result.sinks.table).deep.equal(expected);
        });
    });
});

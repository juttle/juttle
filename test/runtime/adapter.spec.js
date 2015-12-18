var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;

describe('adapter API tests', function () {
    it('fails when you do not provide the `key` to read', function() {
        return check_juttle({
            program: 'read test'
        })
        .then(function() {
            throw new Error("this should fail");
        })
        .then(function(result) {
            expect(result.errors.length).equal(0);
            expect(result.sinks.table.length).equal(0);
        })
        .catch(function(err) {
            expect(err.message).to.equal('Error: invalid read test required option key.');
        });
    });

    it('fails when you do not provide the `key` to write', function() {
        return check_juttle({
            program: 'read test -key "test1" | write test'
        })
        .then(function() {
            throw new Error("this should fail");
        })
        .catch(function(err) {
            expect(err.message).to.equal('Error: invalid write test required option key.');
        });
    });

    it('reads no points initially', function() {
        return check_juttle({
            program: 'read test -key "test1"'
        })
        .then(function(result) {
            expect(result.errors.length).equal(0);
            expect(result.sinks.table.length).equal(0);
        });
    });

    it('can write a point and read it back', function() {
        return check_juttle({
            program: 'emit -limit 1 | put message = "hello test" | write test -key "test2"'
        })
        .then(function(result) {
            expect(result.errors.length).equal(0);
        })
        .then(function() {
            return check_juttle({
                program: 'read test -key "test2"'
            });
        })
        .then(function(result) {
            expect(result.errors.length).equal(0);
            expect(result.sinks.table.length).equal(1);
            expect(result.sinks.table[0].message).equal('hello test');
        });
    });

    it('can write two points and read them back again', function() {
        return check_juttle({
            program: 'emit -limit 1 | put message = "hello test 2" | write test -key "test3"'
        })
        .then(function(result) {
            expect(result.errors.length).equal(0);
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
            expect(result.errors.length).equal(0);
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
            expect(first_node.procName).equal('read-test');

            var second_node = first_node.out_.default[0].proc;
            expect(second_node.procName).equal('clientsink');
            expect(result.sinks.table).deep.equal([{count: 1}]);
            expect(result.prog.graph.count).equal(true);
        });
    });

    it('optimizes multiple nodes', function() {
        var program = 'read test -key "test3" | head 4 | head 3 | head 1';
        return check_juttle({
            program: program
        })
        .then(function(result) {
            expect(result.sinks.table.length).equal(1);
            expect(result.prog.graph.limit).equal(1);
        });
    });

    it('optimizes head | reduce', function() {
        var program = 'read test -key "test3" | head 1 | reduce count()';
        return check_juttle({
            program: program
        })
        .then(function(result) {
            var first_node = result.prog.graph.head[0];
            expect(first_node.procName).equal('read-test');

            var second_node = first_node.out_.default[0].proc;
            expect(second_node.procName).equal('clientsink');

            expect(result.sinks.table).deep.equal([{count: 1}]);
            expect(result.prog.graph.limit).equal(1);
            expect(result.prog.graph.count).equal(true);
        });
    });
});

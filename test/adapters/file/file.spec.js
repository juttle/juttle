var _ = require('underscore');
var expect = require('chai').expect;
var path = require('path');
var tmp = require('tmp');
var fs = require('fs');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var filename = tmp.tmpNameSync();

var validFormats = {
    json: 'json',
    jsonl: 'jsonl',
    csv: 'csv'
};

describe('file adapter tests', function () {
    var file = path.resolve(__dirname, 'input/simple');

    describe('read file', function() {
        _.each(validFormats, function(format) {
            it('uses field specified in timeField with format: ' + format, function() {
                return check_juttle({
                    program: 'read file -timeField "created_at" ' +
                             '          -file "' + file + '.' + format + '" | view result'
                })
                .then(function(result) {
                    var points = result.sinks.result;

                    _.each(points, function(pt) {
                        expect(pt.time).to.equal(pt.created_at);
                    });
                });
            });

            it('read ' + format + ' format', function() {
                return check_juttle({
                    program: 'read file -format "' + format + '" ' +
                             '          -timeField "created_at" ' +
                             '          -file "' + file + '.' + format + '" | view result'
                })
                .then(function(result) {
                    var points = result.sinks.result;

                    expect(points).to.have.length(6);
                    _.each(points, function(pt, i) {
                        expect(pt.time).to.equal(pt.created_at);
                    });
                });
            });

            it('emits a warning if specified timeField does not exist in ' + format + ' data', function() {
                return check_juttle({
                    program: 'read file -timeField "foo" ' +
                             '          -file "' + file + '.' + format + '"' +
                             '          -format "' + format + '"' +
                             ' | view result'
                })
                .then(function(result) {
                    expect(result.warnings[0]).to.include('missing a time in foo');
                });
            });

            it('fails if the ' + format + ' file does not exist', function() {
                return check_juttle({
                    program: 'read file -file "' + filename + '" -format "' + format + '"'
                })
                .then(function(result) {
                    expect(result.errors.length).equal(1);
                    expect(result.errors[0]).match(/ENOENT/);
                });
            });
        });

        it('fails when you do not provide a file to read', function() {
            return check_juttle({
                program: 'read file'
            })
            .then(function() {
                throw new Error("this should have failed");
            })
            .catch(function(err) {
                expect(err.message).equal('Error: missing read file required option file.');
            });
        });

        it('fails if you pass a filter to read', function() {
            return check_juttle({
                program: 'read file -file "' + filename + '" foo=123'
            })
            .then(function() {
                throw new Error("this should have failed");
            })
            .catch(function(err) {
                expect(err.message).equal('Error: filtering is not supported by read file.');
            });
        });

        it('filters points correctly with -from', function() {
            return check_juttle({
                program: 'read file -file "' + file + '.json" -from :1970-01-01T00:00:03.000Z: | keep time, rate'
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.warnings.length).equal(0);
                expect(result.sinks.table).to.deep.equal([
                    { "time": "1970-01-01T00:00:03.000Z", "rate": 2},
                    { "time": "1970-01-01T00:00:04.000Z", "rate": 7},
                    { "time": "1970-01-01T00:00:05.000Z", "rate": 1},
                    { "time": "1970-01-01T00:00:06.000Z", "rate": 3}
                ]);
            });
        });

        it('filters points correctly with -to', function() {
            return check_juttle({
                program: 'read file -file "' + file + '.json" -to :1970-01-01T00:00:03.000Z: | keep time, rate'
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.warnings.length).equal(0);
                expect(result.sinks.table).to.deep.equal([
                    { "time": "1970-01-01T00:00:01.000Z", "rate": 1},
                    { "time": "1970-01-01T00:00:02.000Z", "rate": 5},
                ]);
            });
        });

        it('filters points correctly with -from and -to', function() {
            return check_juttle({
                program: 'read file -file "' + file + '.json" -from :1970-01-01T00:00:03.000Z: -to :1970-01-01T00:00:05.000Z: | keep time, rate'
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.warnings.length).equal(0);
                expect(result.sinks.table).to.deep.equal([
                    { "time": "1970-01-01T00:00:03.000Z", "rate": 2},
                    { "time": "1970-01-01T00:00:04.000Z", "rate": 7},
                ]);
            });
        });

    });

    describe('write file', function() {
        it('fails when you do not provide a file to write', function() {
            return check_juttle({
                program: 'write file'
            })
            .then(function() {
                throw new Error("this should have failed");
            })
            .catch(function(err) {
                expect(err.message).equal('Error: missing write file required option file.');
            });
        });

        it('can write a point and read it back', function() {
            return check_juttle({
                program: 'emit -limit 1 | put message = "hello test" | write file -file "' + filename + '"'
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
            })
            .then(function() {
                return check_juttle({
                    program: 'read file -file "' + filename + '"'
                });
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.sinks.table.length).equal(1);
                expect(result.sinks.table[0].message).equal('hello test');
            })
            .finally(function() {
                fs.unlinkSync(filename);
            });
        });

        it('can write two points and read them back again', function() {
            return check_juttle({
                program: 'emit -limit 1 | put message = "hello test 2" | write file -file "' + filename + '"'
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
            })
            .then(function() {
                return check_juttle({
                    program: 'emit -limit 1 | put message = "hello test 3" | write file -file "' + filename + '"'
                });
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
            })
            .then(function() {
                return check_juttle({
                    program: 'read file -file "' + filename + '"'
                });
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.sinks.table.length).equal(2);
                expect(result.sinks.table[0].message).equal('hello test 2');
                expect(result.sinks.table[1].message).equal('hello test 3');
            })
            .finally(function() {
                fs.unlinkSync(filename);
            });
        });
    });
});

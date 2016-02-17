'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var tmp = require('tmp');
var fs = require('fs');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect_to_fail = juttle_test_utils.expect_to_fail;
var run_read_file_juttle = require('./utils.js').run_read_file_juttle;

var tmp_file = tmp.tmpNameSync();

var symmetricalFormats = {
    json: 'json',
    jsonl: 'jsonl',
    csv: 'csv'
};

describe('write file adapter tests', function () {

    afterEach(function() {
        try {
            fs.unlinkSync(tmp_file);
        } catch(err) { /* file not written -- ignore */ }
    });

    it('fails when you do not provide a file to write', function() {
        var message = 'missing write-file required option file.';
        var failing_write = check_juttle({
            program: 'write file'
        });

        return expect_to_fail(failing_write, message);
    });

    it('fails when you provide an unknown option', function() {
        var message = 'unknown write-file option foo.';
        var failing_write = check_juttle({
            program: 'emit -limit 1 | write file -file "' + tmp_file + '" -foo "bar"'
        });

        return expect_to_fail(failing_write, message);
    });

    it('warns when the underlying serializer emits errors', function() {
        return check_juttle({
            program: '( emit -limit 1 -from :2014-01-01:-:1s: | put foo = "bar"; ' +
                        '  emit -limit 1 -from :2014-01-01: | put fizz = "buzz" )' +
                        '| write file -file "' + tmp_file + '" -format "csv"'
        })
        .then(function(result) {
            expect(result.errors).deep.equals([]);
            expect(result.warnings.length).equal(1);
            expect(result.warnings[0]).to.contain('Invalid CSV data: Found new or missing fields: fizz');
        });
    });

    _.each(symmetricalFormats, function(format) {
        it('can write a point and read it back with ' + format + ' format', function() {
            return check_juttle({
                program: 'emit -limit 1 ' +
                            '| put message = "hello test" ' +
                            '| write file -file "' + tmp_file + '" -format "' + format + '"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);

                return run_read_file_juttle(tmp_file, { format: format });
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.sinks.table.length).equal(1);
                expect(result.sinks.table[0].message).equal('hello test');
            });
        });

        it('can handle writing no points out with ' + format + ' format ', function() {
            return check_juttle({
                program: 'emit -limit 3 -every :1s: ' +
                            '| filter foo="bar" ' +
                            '| write file -file "' + tmp_file + '" -format "' + format + '"'
            })
            .then(function() {
                return run_read_file_juttle(tmp_file, { format: format });
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.equal(0);
            });
        });

        it('can write multiple points and read them back again with ' + format + ' format', function() {
            return check_juttle({
                program: 'emit -limit 10 -every :100ms: ' +
                            '| put value=count(), message="hello test ${value}" ' +
                            '| write file -file "' + tmp_file + '" -format "' + format + '"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                return run_read_file_juttle(tmp_file, { format: format });
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).equal(10);
                for(var index = 0; index < 10; index++) {
                    expect(result.sinks.table[index].message).equal('hello test ' + (index + 1));
                }
            });
        });
    });

    _.each(['csv', 'jsonl'], function(format) {
        it('can append multiple points to a file with ' + format + ' format', function() {
            return check_juttle({
                program: 'emit -limit 1 ' +
                         '| put value=1 ' +
                         '| write file -file "' + tmp_file + '" -format "' + format + '"'
            })
            .then(function(result) {
                expect(result.errors).to.deep.equal([]);
                expect(result.warnings).to.deep.equal([]);
                return check_juttle({
                    program: 'emit -limit 1 ' +
                            '| put value=2 ' +
                            '| write file -file "' + tmp_file + '" -format "' + format + '" -append true'
                });
            })
            .then(function() {
                return run_read_file_juttle(tmp_file, { format: format });
            })
            .then(function(result) {
                expect(result.errors).to.deep.equal([]);
                expect(result.warnings).to.deep.equal([]);
                expect(result.sinks.table.length).equal(2);
                expect(result.sinks.table[0].value).equal(format === 'csv' ? '1' : 1);
                expect(result.sinks.table[1].value).equal(format === 'csv' ? '2' : 2);
            });
        });
    });
});

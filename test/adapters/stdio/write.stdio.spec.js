'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var fs = require('fs');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var tmp = require('tmp');

var validFormats = {
    json: {
        name: 'json',
        typed: true
    },
    jsonl: {
        name: 'jsonl',
        typed: true
    },
    csv: {
        name: 'csv',
        typed: false
    }
};

describe('write stdio adapter tests', function() {

    it('fails when given an unknown option' , function() {
        return check_juttle({
            program: 'emit -limit 1 | write stdio -foo "bar"'
        })
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: unknown write stdio option foo.');
        });
    });

    it('warns when the underlying serializer emits errors', function() {
        var tmpFilename = tmp.tmpNameSync();
        juttle_test_utils.set_stdout(fs.createWriteStream(tmpFilename));

        return check_juttle({
            program: '( emit -limit 1 -from :2014-01-01:-:1s: | put foo = "bar"; ' +
                     '  emit -limit 1 -from :2014-01-01: | put fizz = "buzz" )' +
                     '| write stdio -format "csv"'
        })
        .then(function(result) {
            expect(result.errors).deep.equals([]);
            expect(result.warnings.length).equal(1);
            expect(result.warnings[0]).to.contain('Invalid CSV data: Found new or missing fields: fizz');
        });
    });

    _.each(validFormats, function(details, format) {
        function handle(input) {
            if (details.typed) {
                return input;
            } else {
                return '' + input;
            }
        }

        it('can write nothing out with -format="' + format + '"', function() {
            var tmpFilename = tmp.tmpNameSync();
            juttle_test_utils.set_stdout(fs.createWriteStream(tmpFilename));

            return check_juttle({
                program: 'emit -limit 3 | filter foo="bar" | write stdio -format "' + format + '"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(fs.readFileSync(tmpFilename).toString()).to.equal('');
            });
        });

        it('can write and read points with -format="' + format + '"', function() {
            var tmpFilename = tmp.tmpNameSync();
            juttle_test_utils.set_stdout(fs.createWriteStream(tmpFilename));

            return check_juttle({
                program: 'emit -limit 3 | put foo="bar", index=count() | write stdio -format "' + format + '"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            })
            .then(function() {
                juttle_test_utils.set_stdin(fs.createReadStream(tmpFilename));
                return check_juttle({
                    program: 'read stdio -format "' + format + '" | keep foo, index '
                });
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table).to.deep.equal([
                    { foo: 'bar', index: handle(1) },
                    { foo: 'bar', index: handle(2) },
                    { foo: 'bar', index: handle(3) }
                ]);
            })
            .finally(function() {
                fs.unlinkSync(tmpFilename);
            });
        });
    });
});

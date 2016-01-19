var _ = require('underscore');
var expect = require('chai').expect;
var util = require('util');
var path = require('path');
var tmp = require('tmp');
var fs = require('fs');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect_to_fail = juttle_test_utils.expect_to_fail;

var tmp_file = tmp.tmpNameSync();

var symmetricalFormats = {
    json: 'json',
    jsonl: 'jsonl',
    csv: 'csv'
};

function run_read_file_juttle(filename, options, extra) {
    options = options || {};
    extra = extra || '';
    var options_str = juttle_test_utils.options_from_object(options);
    var program = util.format('read file -file "%s" %s %s', filename, options_str, extra);

    return check_juttle({
        program: program
    });
}

describe('file adapter tests', function () {
    var file = path.resolve(__dirname, 'input/simple');
    var json_file = file + '.json';

    var syslog = path.resolve(__dirname, '../parsers/input/logs/syslog');

    describe('read file', function() {
        it('fails when you provide an unknown option', function() {
            return run_read_file_juttle(tmp_file, {foo: 'bar'})
            .then(function() {
                throw new Error("this should have failed");
            })
            .catch(function(err) {
                expect(err.message).equal('Error: unknown read file option foo.');
            });
        });

        _.each(symmetricalFormats, function(format) {
            describe(format, function() {
                var file_name = file + '.' + format;

                it('read', function() {
                    return run_read_file_juttle(file_name, {format: format, timeField: 'created_at'})
                    .then(function(result) {
                        var points = result.sinks.table;

                        expect(points).to.have.length(6);
                        _.each(points, function(pt, i) {
                            expect(pt.time).to.equal(pt.created_at);
                        });
                    });
                });

                it('emits a warning if specified timeField does not exist', function() {
                    var options = {timeField: 'foo', format: format};
                    return run_read_file_juttle(file_name, options)
                    .then(function(result) {
                        expect(result.warnings[0]).to.include('missing a time in foo');
                    });
                });

                it('fails if the file does not exist', function() {
                    return run_read_file_juttle('bogus', {format: format})
                    .then(function(result) {
                        expect(result.errors.length).equal(1);
                        expect(result.errors[0]).match(/ENOENT/);
                    });
                });

                it('fails if you use -pattern with the non "grok" format', function() {
                    var options = {format: format, pattern: '%{SYSLOGLINE}'};
                    return run_read_file_juttle(file_name, options)
                    .catch(function(err) {
                        expect(err).match(/Error: option pattern can only be used with format="grok"/);
                    });
                });
            });
        });

        it('fails when you do not provide a file to read', function() {
            var message = 'Error: missing read file required option file.';
            var failing_read = check_juttle({
                program: 'read file'
            });

            return expect_to_fail(failing_read, message);
        });

        it('fails if you pass a filter to read', function() {
            var message = 'Error: filtering is not supported by read file.';
            var failing_read = run_read_file_juttle(json_file, {}, 'foo = 123');

            return expect_to_fail(failing_read, message);
        });

        it('filters points correctly with -from', function() {
            var options = {from: '1970-01-01T00:00:03.000Z'};
            return run_read_file_juttle(json_file, options, ' | keep time, rate')
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
            var options = {to: '1970-01-01T00:00:03.000Z'};
            return run_read_file_juttle(json_file, options, ' | keep time, rate')
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
            var options = {
                from: '1970-01-01T00:00:03.000Z',
                to: '1970-01-01T00:00:05.000Z'
            };

            return run_read_file_juttle(json_file, options, '| keep time, rate')
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.warnings.length).equal(0);
                expect(result.sinks.table).to.deep.equal([
                    { "time": "1970-01-01T00:00:03.000Z", "rate": 2},
                    { "time": "1970-01-01T00:00:04.000Z", "rate": 7},
                ]);
            });
        });

        it('fails when -from is an invalid moment', function() {
            var message = 'Error: -from/-to/-last require moments: "a"';

            var program = util.format('read file -file "%s" -from "a"', json_file);
            var failing_read = check_juttle({
                program: program
            });

            return expect_to_fail(failing_read, message);
        });

        it('fails when -to is an invalid moment', function() {
            var message = 'Error: -from/-to/-last require moments: "a"';

            var program = util.format('read file -file "%s" -from "a"', json_file);
            var failing_read = check_juttle({
                program: program
            });

            return expect_to_fail(failing_read, message);
        });

        it('can read syslog file using -format "grok"' , function() {
            return check_juttle({
                program: 'read file -file "' +  syslog + '" -format "grok" -pattern "%{SYSLOGLINE}" | keep program, pid'
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table).to.deep.equal([
                    { program: 'anacron', pid: '15134' },
                    { program: 'anacron', pid: '15134' },
                    { program: 'CRON', pid: '17219' },
                    { program: 'CRON', pid: '17218' }
                ]);
            });
        });

    });

    describe('write file', function() {
        afterEach(function() {
            try {
                fs.unlinkSync(tmp_file);
            } catch(err) { /* file not written -- ignore */ }
        });

        it('fails when you do not provide a file to write', function() {
            var message = 'Error: missing write file required option file.';
            var failing_write = check_juttle({
                program: 'write file'
            });

            return expect_to_fail(failing_write, message);
        });

        it('fails when you provide an unknown option', function() {
            var message = 'Error: unknown write file option foo.';
            var failing_write = check_juttle({
                program: 'emit -limit 1 | write file -file "' + tmp_file + '" -foo "bar"'
            });

            return expect_to_fail(failing_write, message);
        });

        _.each(['limit', 'maxFilesize', 'bufferLimit'], function(option) {
            it('fails when you provide an invalid ' + option, function() {
                var message = util.format('Error: option %s should be a positive integer', option);
                var failing_write = check_juttle({
                    program: 'emit -limit 1 | write file -file "' + tmp_file + '" -' + option + ' -1'
                });

                return expect_to_fail(failing_write, message);
            });
        });

        it('can write a point and read it back', function() {
            return check_juttle({
                program: 'emit -limit 1 | put message = "hello test" | write file -file "' + tmp_file + '"'
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);

                return run_read_file_juttle(tmp_file);
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.sinks.table.length).equal(1);
                expect(result.sinks.table[0].message).equal('hello test');
            });
        });

        it('fails when you attempt to write to a file larger than -maxFilesize', function() {
            return check_juttle({
                program: 'emit -limit 2 -from :2014-01-01: | write file -file "' + tmp_file + '"'
            })
            .then(function() {
                return check_juttle({
                    program: 'emit -limit 1 -from :2014-01-01: | write file -file "' + tmp_file + '" -maxFilesize 2'
                });
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(1);
                expect(result.errors[0]).to.contain('Error: option maxFilesize exceeded limit of 2 bytes');
            });
        });

        it('fails when you exceed the -limit value', function() {
            return check_juttle({
                program: 'emit -limit 2 -from :2014-01-01: | write file -file "' + tmp_file + '" -limit 1'
            })
            .then(function(result) {
                expect(result.errors.length).equal(1);
                expect(result.errors[0]).to.equal('Error: option limit exceeded limit of 1, dropping points.');

                return run_read_file_juttle(tmp_file);
            })
            .then(function(result) {
                expect(result.sinks.table.length).equal(1);
            });
        });

        it('can handle writing no points out', function() {
            return check_juttle({
                program: 'emit -limit 3 -every :1s: | filter foo="bar" | write file -file "' + tmp_file + '"'
            })
            .then(function() {
                return run_read_file_juttle(tmp_file);
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.equal(0);
            });
        });

        it('can write all expected data with a high -bufferLimit', function() {
            return check_juttle({
                program: 'emit -limit 10 | write file -file "' + tmp_file + '" -bufferLimit 1000'
            })
            .then(function() {
                return run_read_file_juttle(tmp_file);
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.equal(10);
            });
        });

        it('can write all expected data with a low -bufferLimit', function() {
            return check_juttle({
                program: 'emit -limit 10 | write file -file "' + tmp_file + '" -bufferLimit 1'
            })
            .then(function() {
                return run_read_file_juttle(tmp_file);
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.equal(10);
            });
        });

        it('fails when you attempt to write to a file with more points than than -limit allows', function() {
            return check_juttle({
                program: 'emit -limit 3 -from :2014-01-01: | write file -file "' + tmp_file + '"'
            })
            .then(function() {
                return check_juttle({
                    program: 'emit -limit 1 -from :2014-01-01: | write file -file "' + tmp_file + '" -limit 2'
                });
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(1);
                expect(result.warnings.length).to.equal(0);
                expect(result.errors[0]).to.contain('Error: option limit exceeded limit of 2, dropping points.');

                return run_read_file_juttle(tmp_file);
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.equal(3);
            });
        });

        it('can write two points and read them back again', function() {
            return check_juttle({
                program: 'emit -limit 1 | put message = "hello test 2" | write file -file "' + tmp_file + '"'
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
            })
            .then(function() {
                return check_juttle({
                    program: 'emit -limit 1 | put message = "hello test 3" | write file -file "' + tmp_file + '"'
                });
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);

                return run_read_file_juttle(tmp_file);
            })
            .then(function(result) {
                expect(result.errors.length).equal(0);
                expect(result.sinks.table.length).equal(2);
                expect(result.sinks.table[0].message).equal('hello test 2');
                expect(result.sinks.table[1].message).equal('hello test 3');
            });
        });

    });

});

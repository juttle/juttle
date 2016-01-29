'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var util = require('util');
var path = require('path');
var tmp = require('tmp');
var fs = require('fs');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var withModuleIt = juttle_test_utils.withModuleIt;
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
    var corrupt = path.resolve(__dirname, 'input/corrupt');
    var json_file = file + '.json';

    var syslog = path.resolve(__dirname, '../parsers/input/logs/syslog');
    var badSyslog = path.resolve(__dirname, '../parsers/input/logs/bad-syslog');

    describe('read file', function() {
        it('fails when you provide an unknown option', function() {
            return run_read_file_juttle(tmp_file, {foo: 'bar'})
            .then(function() {
                throw new Error('this should have failed');
            })
            .catch(function(err) {
                expect(err.message).equal('unknown read file option foo.');
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

                it('read with numeric time field', function() {
                    var file_name = path.resolve(__dirname, 'input/numeric-time-field.' + format);
                    return run_read_file_juttle(file_name, {format: format, timeField: 'mytime'})
                        .then(function(result) {
                            var expected = [
                                { mytime: '1', a: 'a0', time: '1970-01-01T00:00:01.000Z' },
                                { mytime: '267000', a: 'a1', time: '1970-01-04T02:10:00.000Z' },
                                { mytime: '267001', a: 'a2', time: '1970-01-04T02:10:01.000Z' },
                                { mytime: '268000', a: 'a3', time: '1970-01-04T02:26:40.000Z' }
                            ];

                            expect(result.sinks.table).deep.equal(expected);
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
                        expect(err).match(/option pattern can only be used with format="grok"/);
                    });
                });
            });
        });

        it('fails when you do not provide a file to read', function() {
            var message = 'missing read file required option file.';
            var failing_read = check_juttle({
                program: 'read file'
            });

            return expect_to_fail(failing_read, message);
        });

        it('fails if you pass a filter to read', function() {
            var message = 'filtering is not supported by read file.';
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
                    { 'time': '1970-01-01T00:00:03.000Z', 'rate': 2},
                    { 'time': '1970-01-01T00:00:04.000Z', 'rate': 7},
                    { 'time': '1970-01-01T00:00:05.000Z', 'rate': 1},
                    { 'time': '1970-01-01T00:00:06.000Z', 'rate': 3}
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
                    { 'time': '1970-01-01T00:00:01.000Z', 'rate': 1},
                    { 'time': '1970-01-01T00:00:02.000Z', 'rate': 5},
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
                    { 'time': '1970-01-01T00:00:03.000Z', 'rate': 2},
                    { 'time': '1970-01-01T00:00:04.000Z', 'rate': 7},
                ]);
            });
        });

        it('fails when -from is an invalid moment', function() {
            var message = '-from wants a moment, got "a"';

            var program = util.format('read file -file "%s" -from "a"', json_file);
            var failing_read = check_juttle({
                program: program
            });

            return expect_to_fail(failing_read, message);
        });

        it('fails when -to is an invalid moment', function() {
            var message = '-to wants a moment, got "a"';

            var program = util.format('read file -file "%s" -to "a"', json_file);
            var failing_read = check_juttle({
                program: program
            });

            return expect_to_fail(failing_read, message);
        });

        it('fails when -last is an invalid duration', function() {
            var message = '-last wants a duration, got "a"';

            var program = util.format('read file -file "%s" -last "a"', json_file);
            var failing_read = check_juttle({
                program: program
            });

            return expect_to_fail(failing_read, message);
        });

        withModuleIt('can read syslog file using -format "grok"' , function() {
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
        }, 'node-grok');

    });

    describe('write file', function() {
        afterEach(function() {
            try {
                fs.unlinkSync(tmp_file);
            } catch(err) { /* file not written -- ignore */ }
        });

        it('fails when you do not provide a file to write', function() {
            var message = 'missing write file required option file.';
            var failing_write = check_juttle({
                program: 'write file'
            });

            return expect_to_fail(failing_write, message);
        });

        it('fails when you provide an unknown option', function() {
            var message = 'unknown write file option foo.';
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
                expect(result.errors.length).equal(0);
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
                    expect(result.errors.length).equal(0);

                    return run_read_file_juttle(tmp_file, { format: format });
                })
                .then(function(result) {
                    expect(result.errors.length).equal(0);
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
                    expect(result.errors.length).equal(0);
                    return run_read_file_juttle(tmp_file, { format: format });
                })
                .then(function(result) {
                    expect(result.errors.length).equal(0);
                    expect(result.sinks.table.length).equal(10);
                    for(var index = 0; index < 10; index++) {
                        expect(result.sinks.table[index].message).equal('hello test ' + (index + 1));
                    }
                });
            });
        });
    });

    describe('optimizations', function() {
        _.each(symmetricalFormats, function(format) {
            it('fails to optimize tail followed by head with -format "' + format + '"', function() {
                var file_name = file + '.' + format;
                return check_juttle({
                    program: 'read file -file "' + file_name + '" -format "' + format + '" | tail 1 | head 1'
                })
                .then(function(result) {
                    expect(result.errors.length).to.be.equal(0);
                    expect(result.warnings.length).to.be.equal(0);
                    expect(result.sinks.table.length).to.be.equal(1);
                    // not optimized therefore there's no stopAt and we'll
                    // parse the 6 points
                    expect(result.prog.graph.parser.stopAt).to.equal(Number.POSITIVE_INFINITY);
                    expect(result.prog.graph.parser.totalParsed).to.equal(6);
                });
            });

            it('can optimize "| head 1" with -format "' + format + '"', function() {
                // the corrupt file will throw an error if we hit the 3rd entry when
                // parsing and the parsers currently read 1 point ahead
                var file_name = corrupt + '.' + format;
                return check_juttle({
                    program: 'read file -file "' + file_name + '" -format "' + format + '" | head 1'
                })
                .then(function(result) {
                    expect(result.errors.length).to.be.equal(0);
                    expect(result.warnings.length).to.be.equal(0);
                    expect(result.sinks.table.length).to.be.equal(1);
                    expect(result.prog.graph.parser.stopAt).to.equal(1);
                    expect(result.prog.graph.parser.totalParsed).to.equal(2);
                });
            });

            it('can optimize nested "| head 2 | head 1" with -format "' + format + '"', function() {
                // the corrupt file will throw an error if we hit the 3rd entry when
                // parsing and the parsers currently read 1 point ahead
                var file_name = corrupt + '.' + format;
                return check_juttle({
                    program: 'read file -file "' + file_name + '" -format "' + format + '" | head 2 | head 1'
                })
                .then(function(result) {
                    expect(result.errors.length).to.be.equal(0);
                    expect(result.warnings.length).to.be.equal(0);
                    expect(result.sinks.table.length).to.be.equal(1);
                    expect(result.prog.graph.parser.stopAt).to.equal(1);
                    expect(result.prog.graph.parser.totalParsed).to.equal(2);
                });
            });
        });

        withModuleIt('fails to optimized tail followed by head with -format "grok"', function() {
            // the bad syslog file will emit an error if we hit the 3rd entry when
            // parsing and the parsers currently read 1 point ahead
            return check_juttle({
                program: 'read file -file "' +  badSyslog + '" -format "grok" -pattern "%{SYSLOGLINE}" | tail 1 | head 1'
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(2);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.be.equal(1);
                expect(result.prog.graph.parser.stopAt).to.equal(Number.POSITIVE_INFINITY);
                expect(result.prog.graph.parser.totalParsed).to.equal(6);
            });
        }, 'node-grok');

        withModuleIt('can optimize "| head 1" with -format "grok"', function() {
            // the bad syslog file will emit an error if we hit the 3rd entry when
            // parsing and the parsers currently read 1 point ahead
            return check_juttle({
                program: 'read file -file "' +  badSyslog + '" -format "grok" -pattern "%{SYSLOGLINE}" | head 1'
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.be.equal(1);
                expect(result.prog.graph.parser.stopAt).to.equal(1);
                expect(result.prog.graph.parser.totalParsed).to.equal(2);
            });
        }, 'node-grok');

        withModuleIt('can optimize nested "| head 2 | head 1" with -format "grok"', function() {
            // the bad syslog file will emit an error if we hit the 3rd entry when
            // parsing and the parsers currently read 1 point ahead
            return check_juttle({
                program: 'read file -file "' +  badSyslog + '" -format "grok" -pattern "%{SYSLOGLINE}" | head 2 | head 1'
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table.length).to.be.equal(1);
                expect(result.prog.graph.parser.stopAt).to.equal(1);
                expect(result.prog.graph.parser.totalParsed).to.equal(2);
            });
        }, 'node-grok');

    });
});

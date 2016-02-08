'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var util = require('util');
var path = require('path');
var tmp = require('tmp');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var withModuleIt = juttle_test_utils.withModuleIt;
var check_juttle = juttle_test_utils.check_juttle;
var expect_to_fail = juttle_test_utils.expect_to_fail;
var run_read_file_juttle = require('./utils.js').run_read_file_juttle;

var tmp_file = tmp.tmpNameSync();

var symmetricalFormats = {
    json: 'json',
    jsonl: 'jsonl',
    csv: 'csv'
};

describe('read file adapter tests', function () {
    var file = path.resolve(__dirname, 'input/simple');
    var corrupt = path.resolve(__dirname, 'input/corrupt');
    var json_file = file + '.json';

    var syslog = path.resolve(__dirname, '../parsers/input/logs/syslog');
    var badSyslog = path.resolve(__dirname, '../parsers/input/logs/bad-syslog');

    it('fails when you provide an unknown option', function() {
        return run_read_file_juttle(tmp_file, {foo: 'bar'})
        .then(function() {
            throw new Error('this should have failed');
        })
        .catch(function(err) {
            expect(err.message).equal('unknown read-file option foo.');
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
                    _.each(points, function(point, index) {
                        expect(point.time).to.equal('2015-01-01T00:00:0' + (index + 1) + '.000Z');
                        expect(point['undefined']).to.be.undefined;
                    });
                });
            });

            it('read with numeric time field', function() {
                var file_name = path.resolve(__dirname, 'input/numeric-time-field.' + format);
                return run_read_file_juttle(file_name, {format: format, timeField: 'mytime'})
                    .then(function(result) {
                        var expected = [
                            { a: 'a0', time: '1970-01-01T00:00:01.000Z' },
                            { a: 'a1', time: '1970-01-04T02:10:00.000Z' },
                            { a: 'a2', time: '1970-01-04T02:10:01.000Z' },
                            { a: 'a3', time: '1970-01-04T02:26:40.000Z' }
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

    describe('timeField option and invalid time', function() {
        var time_with_other = path.resolve(__dirname, 'input/time-with-other.json');
        var time_garbage = path.resolve(__dirname, 'input/time-garbage.json');
        var jsonPoint = require(time_with_other)[0];

        it('with no options', function() {
            var options = {};
            return run_read_file_juttle(time_with_other, options)
            .then(function(result) {
                expect(result.errors[0]).equal(undefined);
                expect(result.warnings[0]).equal(undefined);

                expect(result.sinks.table[0]).to.deep.equal(jsonPoint);
            });
        });
        it('with option -timeField "other"', function() {
            var options = {timeField: 'other'};
            return run_read_file_juttle(time_with_other, options)
            .then(function(result) {
                expect(result.errors).to.deep.equal([]);
                expect(result.warnings).to.deep.equal([]);

                var expected_result = _.clone(jsonPoint);
                expected_result.time = expected_result.other;
                delete expected_result.other;

                expect(result.sinks.table[0]).to.deep.equal(expected_result);
            });
        });

        it('with no options', function() {
            var options = {};
            return run_read_file_juttle(time_garbage, options)
            .then(function(result) {
                expect(result.warnings[0]).to.contain('the time field must contain a number or a string representing time');
                expect(result.errors[0]).to.equal(undefined);
                expect(result.sinks.table[0]).to.deep.equal(undefined);
            });
        });
        it('with timeField that points to invalid time', function() {
            var options = {timeField: 'value'};
            return run_read_file_juttle(time_garbage, options)
            .then(function(result) {
                expect(result.warnings[0]).to.contain(['the time field must contain a number or a string representing time']);
                expect(result.errors).to.deep.equal([]);
                expect(result.sinks.table).to.deep.equal([]);
            });
        });
    });

    it('fails when you do not provide a file to read', function() {
        var message = 'missing read-file required option file.';
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
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
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
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
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
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
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
                    expect(result.prog.graph.adapter.parser.stopAt).to.equal(Number.POSITIVE_INFINITY);
                    expect(result.prog.graph.adapter.parser.totalParsed).to.equal(6);
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
                    expect(result.prog.graph.adapter.parser.stopAt).to.equal(1);
                    expect(result.prog.graph.adapter.parser.totalParsed).to.equal(2);
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
                    expect(result.prog.graph.adapter.parser.stopAt).to.equal(1);
                    expect(result.prog.graph.adapter.parser.totalParsed).to.equal(2);
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
                expect(result.prog.graph.adapter.parser.stopAt).to.equal(Number.POSITIVE_INFINITY);
                expect(result.prog.graph.adapter.parser.totalParsed).to.equal(6);
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
                expect(result.prog.graph.adapter.parser.stopAt).to.equal(1);
                expect(result.prog.graph.adapter.parser.totalParsed).to.equal(2);
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
                expect(result.prog.graph.adapter.parser.stopAt).to.equal(1);
                expect(result.prog.graph.adapter.parser.totalParsed).to.equal(2);
            });
        }, 'node-grok');

    });
});

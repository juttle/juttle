'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var fs = require('fs');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var withModuleIt = juttle_test_utils.withModuleIt;
var check_juttle = juttle_test_utils.check_juttle;
var path = require('path');

var symmetricalFormats = {
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

describe('read stdio adapter tests', function() {

    var emptyFile = path.resolve(__dirname, 'input/empty');
    // using the existing csv, json and jsonl files from the file adapter
    var simpleBase = path.resolve(__dirname, '../file/input/simple');
    var invalidBase = path.resolve(__dirname, '../parsers/input');
    var corrupt = path.resolve(__dirname, '../file/input/corrupt');

    var syslog = path.resolve(__dirname, '../parsers/input/logs/syslog');
    var badSyslog = path.resolve(__dirname, '../parsers/input/logs/bad-syslog');

    var tsvFile = path.resolve(__dirname, '../parsers/input/tsv/points.tsv');

    var csvFileWithIncompleteLines = path.resolve(__dirname, '../parsers/input/csv/invalid.csv');
    var csvFileWithComments = path.resolve(__dirname, '../parsers/input/csv/points-with-comments.csv');
    var csvFileWithEmptyLines = path.resolve(__dirname, '../parsers/input/csv/points-with-empty-lines.csv');

    it('fails when given an unknown option' , function() {
        juttle_test_utils.set_stdin(fs.createReadStream(emptyFile));

        return check_juttle({
            program: 'read stdio -foo "bar"'
        })
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: unknown read-stdio option foo.');
        });
    });

    it('fails when given a filter expression' , function() {
        juttle_test_utils.set_stdin(fs.createReadStream(emptyFile));

        return check_juttle({
            program: 'read stdio foo="bar"'
        })
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: filtering is not supported by read stdio');
        });
    });

    _.each(symmetricalFormats, function(details, format) {
        it('fails when reading invalid ' + format , function() {
            var filename = path.join(invalidBase, format, 'invalid.' + format);
            juttle_test_utils.set_stdin(fs.createReadStream(filename));

            return check_juttle({
                program: 'read stdio -format "' + format + '"'
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(1);
                expect(result.warnings).deep.equals([]);
                expect(result.errors[0]).to.contain('Invalid ' + format.toUpperCase() + ' data');
            });
        });

        it('can handle an empty stdin with -format=' + format , function() {
            juttle_test_utils.set_stdin(fs.createReadStream(emptyFile));

            return check_juttle({
                program: 'read stdio'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).to.equal(0);
            });
        });

        it('can read ' + format + ' data from stdin' , function() {
            juttle_test_utils.set_stdin(fs.createReadStream(simpleBase + '.' + format));

            function handle(input) {
                if (details.typed) {
                    return input;
                } else {
                    return '' + input;
                }
            }

            return check_juttle({
                program: 'read stdio -format "' + format + '" | keep time, rate'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table).to.deep.equal([
                    { 'time': '1970-01-01T00:00:01.000Z', 'rate': handle(1) },
                    { 'time': '1970-01-01T00:00:02.000Z', 'rate': handle(5) },
                    { 'time': '1970-01-01T00:00:03.000Z', 'rate': handle(2) },
                    { 'time': '1970-01-01T00:00:04.000Z', 'rate': handle(7) },
                    { 'time': '1970-01-01T00:00:05.000Z', 'rate': handle(1) },
                    { 'time': '1970-01-01T00:00:06.000Z', 'rate': handle(3) }
                ]);
            });
        });
    });

    withModuleIt('can read syslog data from stdin using -format "grok"' , function() {
        juttle_test_utils.set_stdin(fs.createReadStream(syslog));

        return check_juttle({
            program: 'read stdio -format "grok" -pattern "%{SYSLOGLINE}" | keep program, pid'
        })
        .then(function(result) {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
            expect(result.sinks.table).to.deep.equal([
                { program: 'anacron', pid: '15134' },
                { program: 'anacron', pid: '15134' },
                { program: 'CRON', pid: '17219' },
                { program: 'CRON', pid: '17218' }
            ]);
        });
    }, 'node-grok');

    describe('optimizations', function() {
        _.each(symmetricalFormats, function(details, format) {
            it('fails to optimize tail followed by head with -format "' + format + '"', function() {
                var file_name = simpleBase + '.' + format;
                juttle_test_utils.set_stdin(fs.createReadStream(file_name));

                return check_juttle({
                    program: 'read stdio -format "' + format + '" | tail 1 | head 1'
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
                juttle_test_utils.set_stdin(fs.createReadStream(file_name));

                return check_juttle({
                    program: 'read stdio -format "' + format + '" | head 1'
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
                juttle_test_utils.set_stdin(fs.createReadStream(file_name));

                return check_juttle({
                    program: 'read stdio -format "' + format + '" | head 2 | head 1'
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
            juttle_test_utils.set_stdin(fs.createReadStream(badSyslog));

            return check_juttle({
                program: 'read stdio -format "grok" -pattern "%{SYSLOGLINE}" | tail 1 | head 1'
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(2);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).to.be.equal(1);
                expect(result.prog.graph.adapter.parser.stopAt).to.equal(Number.POSITIVE_INFINITY);
                expect(result.prog.graph.adapter.parser.totalParsed).to.equal(6);
            });
        }, 'node-grok');

        withModuleIt('can optimize "| head 1" with -format "grok"', function() {
            // the bad syslog file will emit an error if we hit the 3rd entry when
            // parsing and the parsers currently read 1 point ahead
            juttle_test_utils.set_stdin(fs.createReadStream(badSyslog));

            return check_juttle({
                program: 'read stdio -format "grok" -pattern "%{SYSLOGLINE}" | head 1'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).to.be.equal(1);
                expect(result.prog.graph.adapter.parser.stopAt).to.equal(1);
                expect(result.prog.graph.adapter.parser.totalParsed).to.equal(2);
            });
        }, 'node-grok');

        withModuleIt('can optimize nested "| head 2 | head 1" with -format "grok"', function() {
            // the bad syslog file will emit an error if we hit the 3rd entry when
            // parsing and the parsers currently read 1 point ahead
            juttle_test_utils.set_stdin(fs.createReadStream(badSyslog));

            return check_juttle({
                program: 'read stdio -format "grok" -pattern "%{SYSLOGLINE}" | head 2 | head 1'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).to.be.equal(1);
                expect(result.prog.graph.adapter.parser.stopAt).to.equal(1);
                expect(result.prog.graph.adapter.parser.totalParsed).to.equal(2);
            });
        }, 'node-grok');

    });

    it('can read TSV through stdio', () => {
        juttle_test_utils.set_stdin(fs.createReadStream(tsvFile));

        return check_juttle({
            program: 'read stdio -format "csv" -separator "\t"'
        })
        .then(function(result) {
            expect(result.errors.length).to.equal(0);
            expect(result.warnings.length).to.equal(0);
            expect(result.sinks.table).to.deep.equal([
                { time: '2014-01-01T00:00:01.000Z', foo: '1' },
                { time: '2014-01-01T00:00:02.000Z', foo: '2' },
                { time: '2014-01-01T00:00:03.000Z', foo: '3' }
            ]);
        });
    });

    it('can read a CSV file with comments', () => {
        juttle_test_utils.set_stdin(fs.createReadStream(csvFileWithComments));

        return check_juttle({
            program: 'read stdio -format "csv" -commentSymbol "#"'
        })
        .then(function(result) {
            expect(result.errors.length).to.equal(0);
            expect(result.warnings.length).to.equal(0);
            expect(result.sinks.table).to.deep.equal([
                { time: '2014-01-01T00:00:01.000Z', foo: '1' },
                { time: '2014-01-01T00:00:02.000Z', foo: '2' },
                { time: '2014-01-01T00:00:03.000Z', foo: '3' }
            ]);
        });
    });

    it('can read a CSV file with empty lines', () => {
        juttle_test_utils.set_stdin(fs.createReadStream(csvFileWithEmptyLines));

        return check_juttle({
            program: 'read stdio -format "csv" -ignoreEmptyLines true'
        })
        .then(function(result) {
            expect(result.errors.length).to.equal(0);
            expect(result.warnings.length).to.equal(0);
            expect(result.sinks.table).to.deep.equal([
                { time: '2014-01-01T00:00:01.000Z', foo: '1' },
                { time: '2014-01-01T00:00:02.000Z', foo: '2' },
                { time: '2014-01-01T00:00:03.000Z', foo: '3' }
            ]);
        });
    });

    it('can read a CSV file with incomplete lines', () => {
        juttle_test_utils.set_stdin(fs.createReadStream(csvFileWithIncompleteLines));

        return check_juttle({
            program: 'read stdio -format "csv" -allowIncompleteLines true'
        })
        .then(function(result) {
            expect(result.errors.length).to.equal(0);
            expect(result.warnings.length).to.equal(0);
            expect(result.sinks.table).to.deep.equal([
                { a: '1', b: '2', c: '' }
            ]);
        });
    });

    it('can read stream data correctly', () => {
        // fake stdin which emits 1 points every 100ms for 20 iterations
        juttle_test_utils.set_stdin({
            on: (event, callback) => {},

            pipe: (destination, options) => {
                function writeIt(writesLeft) {
                    if (writesLeft > 0) {
                        writesLeft--;
                        destination.write(JSON.stringify({
                            index: writesLeft,
                            foo: 'bar'
                        }) + '\n');
                        setTimeout(writeIt, 1, writesLeft);
                    } else {
                        destination.end();
                    }
                }

                writeIt(2048);
            }
        });

        return check_juttle({
            // we can verify that the data was actually streamed if the "distance"
            // between dispatching each point is greater than 1s otherwise we're 
            // certain that the points were all dispatched only when the stream
            // eof'ed and read was able to receive those points and flush them out
            program: 'read stdio -format "jsonl" ' + 
                     '| put dtime=Date.time() ' + 
                     '| reduce last=last(dtime), first=first(dtime) ' + 
                     '| put distance=Duration.as(last-first, "seconds") ' + 
                     '| keep distance'
        })
        .then(function(result) {
            expect(result.errors.length).to.equal(0);
            expect(result.warnings.length).to.equal(0);
            expect(result.sinks.table[0].distance).to.be.greaterThan(1);
        });
    });
});

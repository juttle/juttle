var _ = require('underscore');
var expect = require('chai').expect;
var fs = require('fs');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
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

    var syslog = path.resolve(__dirname, '../parsers/input/logs/syslog');

    it('fails when given an unknown option' , function() {
        juttle_test_utils.set_stdin(fs.createReadStream(emptyFile));

        return check_juttle({
            program: 'read stdio -foo "bar"'
        })
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: unknown read stdio option foo.');
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
                expect(result.warnings.length).to.equal(0);
                expect(result.errors[0]).to.contain('Error: Invalid ' + format.toUpperCase() + ' data');
            });
        });

        it('can handle an empty stdin with -format=' + format , function() {
            juttle_test_utils.set_stdin(fs.createReadStream(emptyFile));

            return check_juttle({
                program: 'read stdio'
            })
            .then(function(result) {
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
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
                expect(result.errors.length).to.equal(0);
                expect(result.warnings.length).to.equal(0);
                expect(result.sinks.table).to.deep.equal([
                    { "time": "1970-01-01T00:00:01.000Z", "rate": handle(1) },
                    { "time": "1970-01-01T00:00:02.000Z", "rate": handle(5) },
                    { "time": "1970-01-01T00:00:03.000Z", "rate": handle(2) },
                    { "time": "1970-01-01T00:00:04.000Z", "rate": handle(7) },
                    { "time": "1970-01-01T00:00:05.000Z", "rate": handle(1) },
                    { "time": "1970-01-01T00:00:06.000Z", "rate": handle(3) }
                ]);
            });
        });
    });

    it('can read syslog data from stdin using -format "grok"' , function() {
        juttle_test_utils.set_stdin(fs.createReadStream(syslog));

        return check_juttle({
            program: 'read stdio -format "grok" -pattern "%{SYSLOGLINE}" | keep program, pid'
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

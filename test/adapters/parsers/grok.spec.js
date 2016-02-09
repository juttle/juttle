'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var parsers = require('../../../lib/adapters/parsers');
var path = require('path');
var tmp = require('tmp');
var juttleTestUtils = require('../../runtime/specs/juttle-test-utils');

var withGrokIt = function(describe, fn) {
    return juttleTestUtils.withModuleIt(describe, fn,  'node-grok');
};

describe('parsers/grok', function() {
    var empty = path.resolve(__dirname, 'input/logs/empty.log');
    var syslog = path.resolve(__dirname, 'input/logs/syslog');
    var badSyslog = path.resolve(__dirname, 'input/logs/bad-syslog');

    withGrokIt('can instantiate a grok parser', function() {
        var parser = parsers.getParser('grok');
        expect(parser).to.not.be.undefined;
    });

    withGrokIt('can read an empty file', function() {
        var parser = parsers.getParser('grok');
        var results = [];
        return parser.parseStream(fs.createReadStream(empty), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results).to.deep.equal([[]]);
        });
    });

    withGrokIt('can parse syslog file', function() {
        var parser = parsers.getParser('grok', {
            pattern: '%{SYSLOGLINE}'
        });
        var results = [];
        return parser.parseStream(fs.createReadStream(syslog), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results).to.deep.equal([[
                {'timestamp':'Jan  6 10:54:52','logsource':'x230','program':'anacron','pid':'15134','message':'Job `cron.daily\' terminated'},
                {'timestamp':'Jan  6 10:54:52','logsource':'x230','program':'anacron','pid':'15134','message':'Normal exit (1 job run)'},
                {'timestamp':'Jan  6 11:17:01','logsource':'x230','program':'CRON','pid':'17219','message':'(root) CMD (   cd / && run-parts --report /etc/cron.hourly)'},
                {'timestamp':'Jan  6 11:17:01','logsource':'x230','program':'CRON','pid':'17218','message':'(root) MAIL (mailed 1 byte of output; but got status 0x00ff, #012)'}
            ]]);
        });
    });

    withGrokIt('can parse a file with invalid syslog lines', function() {
        var parser = parsers.getParser('grok', {
            pattern: '%{SYSLOGLINE}'
        });

        var errors = [];
        parser.on('error', function(err) {
            errors.push(err);
        });
        var results = [];
        return parser.parseStream(fs.createReadStream(badSyslog), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(errors.length).to.equal(2);
            expect(errors[0].toString()).to.contain('Skipping line "invalid line", due to: not matching pattern');
            expect(errors[1].toString()).to.contain('Skipping line "invalid line", due to: not matching pattern');
            expect(results).to.deep.equal([[
                {'timestamp':'Jan  6 10:54:52','logsource':'x230','program':'anacron','pid':'15134','message':'Job `cron.daily\' terminated'},
                {'timestamp':'Jan  6 10:54:52','logsource':'x230','program':'anacron','pid':'15134','message':'Normal exit (1 job run)'},
                {'timestamp':'Jan  6 11:17:01','logsource':'x230','program':'CRON','pid':'17219','message':'(root) CMD (   cd / && run-parts --report /etc/cron.hourly)'},
                {'timestamp':'Jan  6 11:17:01','logsource':'x230','program':'CRON','pid':'17218','message':'(root) MAIL (mailed 1 byte of output; but got status 0x00ff, #012)'}
            ]]);
        });
    });

    withGrokIt('calls emit multiple times with payload limit specified', function() {
        var csv = parsers.getParser('grok', {
            limit: 1,
            pattern: '%{SYSLOGLINE}'
        });
        var results = [];
        return csv.parseStream(fs.createReadStream(syslog), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(5);
            expect(results).to.deep.equal([
                [{'timestamp':'Jan  6 10:54:52','logsource':'x230','program':'anacron','pid':'15134','message':'Job `cron.daily\' terminated'}],
                [{'timestamp':'Jan  6 10:54:52','logsource':'x230','program':'anacron','pid':'15134','message':'Normal exit (1 job run)'}],
                [{'timestamp':'Jan  6 11:17:01','logsource':'x230','program':'CRON','pid':'17219','message':'(root) CMD (   cd / && run-parts --report /etc/cron.hourly)'}],
                [{'timestamp':'Jan  6 11:17:01','logsource':'x230','program':'CRON','pid':'17218','message':'(root) MAIL (mailed 1 byte of output; but got status 0x00ff, #012)'}],
                []
            ]);
        });
    });

    withGrokIt('stops emitting values after the optimization.limit', function() {
        // the read ahead buffer of the parser will always read more points
        // that we actually want to parse but lets make sure this does not // read the whole file by writing out enough data
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        for(var index = 0; index < 1000; index++) {
            stream.write('Jan  6 10:54:52 x230 anacron[' +
                         parseInt(Math.random()*64*1024) +
                         ']: ' + Array(1024).join('X') + '\n');
        }
        stream.end();

        var parser = parsers.getParser('grok', {
            pattern: '%{SYSLOGLINE}',
            optimization: {
                type: 'head',
                limit: 1
            }
        });

        var results = [];
        return parser.parseStream(fs.createReadStream(tmpFilename), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).to.be.equal(2); // 1 point + empty batch
            expect(parser.totalRead).to.be.lessThan(500);
            expect(parser.totalParsed).to.equal(2); // always parse one ahead
        })
        .finally(function() {
            fs.unlinkSync(tmpFilename);
        });
    });

});

'use strict';

var fs = require('fs');
var expect = require('chai').expect;
var parsers = require('../../../lib/adapters/parsers');
var path = require('path');

describe('parsers/columns', function() {
    var emptyFile = path.resolve(__dirname, 'input/columns/empty.txt');
    var headersOnlyFile = path.resolve(__dirname, 'input/columns/headers-only.txt');
    var pointFile = path.resolve(__dirname, 'input/columns/point.txt');
    var pointsFile = path.resolve(__dirname, 'input/columns/points.txt');
    var lsofFile = path.resolve(__dirname, 'input/columns/lsof.txt');
    var psFile = path.resolve(__dirname, 'input/columns/ps.txt');

    it('can instantiate a columns parser', function() {
        var columns = parsers.getParser('columns');
        expect(columns).to.not.be.undefined;
    });

    it('can extract columns', function() {
        var parser = parsers.getParser('columns');
        expect(parser.findColumns('ABC D   EF    GHI   ')).deep.equals([
            {
                start: 0,
                end: 3,
                value: 'ABC'
            },
            {
                start: 4,
                end: 5,
                value: 'D'
            },
            {
                start: 8,
                end: 10,
                value: 'EF'
            },
            {
                start: 14,
                end: 17,
                value: 'GHI'
            },
        ]);
    });

    function getValues(parser, headers, columns) {
        return parser.getValues(parser.findColumns(headers), parser.findColumns(columns), columns);
    }

    it('can match aligned columns', function() {
        var parser = parsers.getParser('columns');
        var headers = 'ABC   DEF   GHI    JKL';
        var columns = '123   456   789    012';

        expect(getValues(parser, headers, columns)).deep.equals({
            ABC: '123',
            DEF: '456',
            GHI: '789',
            JKL: '012'
        });
    });

    it('can match left-aligned columns', function() {
        var parser = parsers.getParser('columns');
        var headers = 'ABC DEF GHI JKL';
        var columns = '1   2   3   4';

        expect(getValues(parser, headers, columns)).deep.equals({
            ABC: '1',
            DEF: '2',
            GHI: '3',
            JKL: '4'
        });
    });

    it('can match right-aligned columns', function() {
        var parser = parsers.getParser('columns');
        var headers = 'ABC DEF GHI JKL';
        var columns = '  1   2   3   4';

        expect(getValues(parser, headers, columns)).deep.equals({
            ABC: '1',
            DEF: '2',
            GHI: '3',
            JKL: '4'
        });
    });

    it('can match hanging columns', function() {
        var parser = parsers.getParser('columns');
        var headers = 'ABC  DEF  GHI  JKL';
        var columns = '  1a   2b   3c   4d';

        expect(getValues(parser, headers, columns)).deep.equals({
            ABC: '1a',
            DEF: '2b',
            GHI: '3c',
            JKL: '4d'
        });
    });

    it('can skip missing columns', function() {
        var parser = parsers.getParser('columns');
        var headers = 'ABC  DEF  GHI  JKL';
        var columns = '  1        2     3';

        expect(getValues(parser, headers, columns)).deep.equals({
            ABC: '1',
            DEF: null,
            GHI: '2',
            JKL: '3'
        });
    });

    it('handles blank lines', function() {
        var parser = parsers.getParser('columns');
        var headers = 'ABC  DEF  GHI  JKL';
        var columns = '';

        expect(getValues(parser, headers, columns)).deep.equals({
            ABC: null,
            DEF: null,
            GHI: null,
            JKL: null
        });
    });

    it('combines trailing columns', function() {
        var parser = parsers.getParser('columns');
        var headers = 'ABC  DEF  GHI  JKL';
        var columns = '111  222  333  444 555   666   777 888';

        expect(getValues(parser, headers, columns)).deep.equals({
            ABC: '111',
            DEF: '222',
            GHI: '333',
            JKL: '444 555   666   777 888'
        });
    });

    it('fails when given an empty file', function() {
        var parser = parsers.getParser('columns');
        return parser.parseStream(fs.createReadStream(emptyFile), function() {})
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid column text data: no headers');
        });
    });

    it('emits no points when a file only has headers', function() {
        var parser = parsers.getParser('columns');
        var results = [];
        return parser.parseStream(fs.createReadStream(headersOnlyFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results).deep.equals([]);
        });
    });

    it('can parse a file with a single point', function() {
        var columns = parsers.getParser('columns');
        var results = [];
        return columns.parseStream(fs.createReadStream(pointFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results).to.deep.equal([[
                {
                    'time': '2014-01-01T00:00:00.000Z',
                    'foo': '1'
                }
            ]]);
        });
    });

    it('can parse a file with multiple points', function() {
        var columns = parsers.getParser('columns');
        var results = [];
        return columns.parseStream(fs.createReadStream(pointsFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(1);
            expect(results).to.deep.equal([[
                { 'time': '2014-01-01T00:00:01.000Z', 'foo': '1' },
                { 'time': '2014-01-01T00:00:02.000Z', 'foo': '2' },
                { 'time': '2014-01-01T00:00:03.000Z', 'foo': '3' }
            ]]);
        });
    });

    it('calls emit multiple times with payload limit specified', function() {
        var columns = parsers.getParser('columns', { limit: 1 });
        var results = [];
        return columns.parseStream(fs.createReadStream(pointsFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results).to.deep.equal([
                [{ 'time': '2014-01-01T00:00:01.000Z', 'foo': '1' }],
                [{ 'time': '2014-01-01T00:00:02.000Z', 'foo': '2' }],
                [{ 'time': '2014-01-01T00:00:03.000Z', 'foo': '3' }]
            ]);
        });
    });

    it('can parse ps output', function() {
        var columns = parsers.getParser('columns');
        var results = [];
        return columns.parseStream(fs.createReadStream(psFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results[0][0]).deep.equals({
                'CMD': 'login -fp demmer',
                'PID': '462',
                'TIME': '0:00.05',
                'TTY': 'ttys000'
            });
            expect(results[0][9]).deep.equals({
                'CMD': '/Library/Ruby/Gems/2.0.0/gems/rb-fsevent-0.9.7/bin/fsevent_watch --latency 0.1 /Users/demmer/work/website',
                'PID': '18860',
                'TIME': '0:00.02',
                'TTY': 'ttys003'
            });
            expect(results[0].length).equals(27);
        });
    });

    it('can parse lsof output', function() {
        var columns = parsers.getParser('columns');
        var results = [];
        return columns.parseStream(fs.createReadStream(lsofFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results[0][0]).deep.equals({
                'COMMAND': 'loginwind',
                'PID': '97',
                'USER': 'demmer',
                'FD': 'cwd',
                'TYPE': 'DIR',
                'DEVICE': '1,4',
                'SIZE/OFF': '1326',
                'NODE': '2',
                'NAME': '/'
            });
            expect(results[0][36]).deep.equals({
                'COMMAND': 'loginwind',
                'PID': '97',
                'USER': 'demmer',
                'FD': '3u',
                'TYPE': 'KQUEUE',
                'DEVICE': null,
                'SIZE/OFF': null,
                'NODE': null,
                'NAME': 'count=2, state=0x12'
            });
            expect(results[0].length).equals(46);
        });
    });

    it('stops emitting values after the optimization.limit', function() {
        var columns = parsers.getParser('columns', {
            optimization: {
                type: 'head',
                limit: 1
            }
        });

        var results = [];
        return columns.parseStream(fs.createReadStream(lsofFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).to.be.equal(1); // 1 point
            expect(columns.totalParsed).to.equal(1);
        });
    });
});

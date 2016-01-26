'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var parsers = require('../../../lib/adapters/parsers');
var path = require('path');

describe('parsers/jsonl', function() {
    var pointFile = path.resolve(__dirname, 'input/jsonl/point.jsonl');
    var pointsFile = path.resolve(__dirname, 'input/jsonl/points.jsonl');
    var invalidFile = path.resolve(__dirname, 'input/jsonl/invalid.jsonl');

    it('can instantiate a jsonl parser', function() {
        var jsonl = parsers.getParser('jsonl');
        expect(jsonl).to.not.be.undefined();
    });

    it('fails when given an invalid JSONL stream', function() {
        var jsonl = parsers.getParser('jsonl');
        return jsonl.parseStream(fs.createReadStream(invalidFile), function() {})
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid JSONL data');
        });
    });

    it('can parse a file with a single JSONL point', function() {
        var jsonl = parsers.getParser('jsonl');
        var results = [];
        return jsonl.parseStream(fs.createReadStream(pointFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results).to.deep.equal([[
                {
                    'time': '2014-01-01T00:00:00.000Z',
                    'foo': 1
                }
            ]]);
        });
    });

    it('can parse a file with multiple JSONL points', function() {
        var jsonl = parsers.getParser('jsonl');
        var results = [];
        return jsonl.parseStream(fs.createReadStream(pointsFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(1);
            expect(results).to.deep.equal([[
                { 'time': '2014-01-01T00:00:01.000Z', 'foo': 1 },
                { 'time': '2014-01-01T00:00:02.000Z', 'foo': 2 },
                { 'time': '2014-01-01T00:00:03.000Z', 'foo': 3 }
            ]]);
        });
    });

    it('calls emit multiple times with payload limit specified', function() {
        var jsonl = parsers.getParser('jsonl', { limit: 1 });
        var results = [];
        return jsonl.parseStream(fs.createReadStream(pointsFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(4);
            expect(results).to.deep.equal([
                [{ 'time': '2014-01-01T00:00:01.000Z', 'foo': 1 }],
                [{ 'time': '2014-01-01T00:00:02.000Z', 'foo': 2 }],
                [{ 'time': '2014-01-01T00:00:03.000Z', 'foo': 3 }],
                []
            ]);
        });
    });

    it('stops emitting values after the optimization.limit', function() {
        var parser = parsers.getParser('jsonl', {
            optimization: {
                type: 'head',
                limit: 1
            }
        });
        var results = [];
        return parser.parseStream(fs.createReadStream(pointsFile), function(result) {
            results.push(result);
        })
        .then(function() {
            // the jsonl parser that actually that allows us to stop as soon as
            // we've reached the desired limit without emitting any additional
            // points
            expect(results.length).to.equal(2);
            expect(parser.totalRead).to.equal(2);
            expect(parser.totalParsed).to.equal(2);
            expect(results).to.deep.equal([
                [{ 'time': '2014-01-01T00:00:01.000Z', 'foo': 1 }],
                []
            ]);
        });
    });

});

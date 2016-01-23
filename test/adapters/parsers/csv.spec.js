'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var parsers = require('../../../lib/adapters/parsers');
var path = require('path');

describe('parsers/csv', function() {
    var pointFile = path.resolve(__dirname, 'input/csv/point.csv');
    var pointsFile = path.resolve(__dirname, 'input/csv/points.csv');
    var invalidFile = path.resolve(__dirname, 'input/csv/invalid.csv');

    it('can instantiate a csv parser', function() {
        var csv = parsers.getParser('csv');
        expect(csv).to.not.be.undefined();
    });

    it('fails when given an invalid CSV stream', function() {
        var csv = parsers.getParser('csv');
        return csv.parseStream(fs.createReadStream(invalidFile), function() {})
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid CSV data');
        });
    });

    it('can parse a file with a single CSV point', function() {
        var csv = parsers.getParser('csv');
        var results = [];
        return csv.parseStream(fs.createReadStream(pointFile), function(result) {
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

    it('can parse a file with multiple CSV points', function() {
        var csv = parsers.getParser('csv');
        var results = [];
        return csv.parseStream(fs.createReadStream(pointsFile), function(result) {
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
        var csv = parsers.getParser('csv', { limit: 1 });
        var results = [];
        return csv.parseStream(fs.createReadStream(pointsFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(4);
            expect(results).to.deep.equal([
                [{ 'time': '2014-01-01T00:00:01.000Z', 'foo': '1' }],
                [{ 'time': '2014-01-01T00:00:02.000Z', 'foo': '2' }],
                [{ 'time': '2014-01-01T00:00:03.000Z', 'foo': '3' }],
                []
            ]);
        });
    });
});

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
        csv.parseStream(fs.createReadStream(invalidFile))
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid CSV data');
        });
    });

    it('can parse a single CSV point', function(done) {
        var csv = parsers.getParser('csv');
        csv.parseStream(fs.createReadStream(pointFile), function(result) {
            expect(result).to.deep.equal([
                {
                    'time': '2014-01-01T00:00:00.000Z',
                    'foo': '1'
                }
            ]);
            done();
        });
    });

    it('can parse a mutliple CSV points', function(done) {
        var csv = parsers.getParser('csv');
        csv.parseStream(fs.createReadStream(pointsFile), function(result) {
            expect(result).to.deep.equal([
                { 'time': '2014-01-01T00:00:01.000Z', 'foo': '1' },
                { 'time': '2014-01-01T00:00:02.000Z', 'foo': '2' },
                { 'time': '2014-01-01T00:00:03.000Z', 'foo': '3' }
            ]);
            done();
        });
    });

    it('emits points with payload limit specified', function(done) {
        var csv = parsers.getParser('csv', { limit: 1 });
        var emit = 0;
        csv.parseStream(fs.createReadStream(pointsFile), function(result) {
            expect(result).to.deep.equal([
                { 'time': '2014-01-01T00:00:0' + (emit + 1) + '.000Z', 'foo': '' + (emit + 1) },
            ]);

            emit++;
            if (emit === 3) {
                done();
            }
        });
    });
});

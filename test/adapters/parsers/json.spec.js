var expect = require('chai').expect;
var fs = require('fs');
var parsers = require('../../../lib/adapters/parsers');
var path = require('path');

describe('parsers/json', function() {
    var pointFile = path.resolve(__dirname, 'input/json/point.json');
    var pointsFile = path.resolve(__dirname, 'input/json/points.json');
    var invalidFile = path.resolve(__dirname, 'input/json/invalid.json');

    it('can instantiate a json parser', function() {
        var json = parsers.getParser('json');
        expect(json).to.not.be.undefined();
    });

    it('fails when given an invalid JSON stream', function() {
        var json = parsers.getParser('json');
        json.parseStream(fs.createReadStream(invalidFile), function() {})
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid JSON data');
        });
    });

    it('can parse a single JSON point', function(done) {
        var json = parsers.getParser('json');
        json.parseStream(fs.createReadStream(pointFile), function(result) {
            expect(result).to.deep.equal([
                {
                    "time": "2014-01-01T00:00:00.000Z",
                    "foo": 1
                }
            ]);
            done();
        });
    });

    it('can parse a JSON array', function(done) {
        var json = parsers.getParser('json');
        json.parseStream(fs.createReadStream(pointsFile), function(result) {
            expect(result).to.deep.equal([
                { "time": "2014-01-01T00:00:01.000Z", "foo": 1 },
                { "time": "2014-01-01T00:00:02.000Z", "foo": 2 },
                { "time": "2014-01-01T00:00:03.000Z", "foo": 3 }
            ]);
            done();
        });
    });

    it('emits points with payload limit specified', function(done) {
        var json = parsers.getParser('json', { limit: 1 });
        var emit = 0;
        json.parseStream(fs.createReadStream(pointsFile), function(result) {
            expect(result).to.deep.equal([
                { "time": "2014-01-01T00:00:0" + (emit + 1) + ".000Z", "foo": (emit + 1) },
            ]);

            emit++;
            if (emit === 3) {
                done();
            }
        });
    });
});

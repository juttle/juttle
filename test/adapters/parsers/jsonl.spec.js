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
        jsonl.parseStream(fs.createReadStream(invalidFile))
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid JSONL data');
        });
    });

    it('can parse a single JSONL point', function(done) {
        var jsonl = parsers.getParser('jsonl');
        jsonl.parseStream(fs.createReadStream(pointFile), function(result) {
            expect(result).to.deep.equal([
                {
                    "time": "2014-01-01T00:00:00.000Z",
                    "foo": 1
                }
            ]);
            done();
        });
    });

    it('can parse multiple points in JSONL format', function(done) {
        var jsonl = parsers.getParser('jsonl');
        jsonl.parseStream(fs.createReadStream(pointsFile), function(result) {
            expect(result).to.deep.equal([
                { "time": "2014-01-01T00:00:01.000Z", "foo": 1 },
                { "time": "2014-01-01T00:00:02.000Z", "foo": 2 },
                { "time": "2014-01-01T00:00:03.000Z", "foo": 3 }
            ]);
            done();
        });
    });

    it('emits points with payload limit specified', function(done) {
        var jsonl = parsers.getParser('jsonl', { limit: 1 });
        var emit = 0;
        jsonl.parseStream(fs.createReadStream(pointsFile), function(result) {
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

var expect = require('chai').expect;
var fs = require('fs');
var parsers = require('../../../lib/adapters/parsers');
var path = require('path');

describe('parsers/json', function() {
    var pointFile = path.resolve(__dirname, 'input/json/point.json');
    var pointWithArrayFile = path.resolve(__dirname, 'input/json/point_with_nested_array.json');
    var pointsWithArrayFile = path.resolve(__dirname, 'input/json/points_with_nested_arrays.json');
    var pointsFile = path.resolve(__dirname, 'input/json/points.json');
    var invalidFile = path.resolve(__dirname, 'input/json/invalid.json');

    it('can instantiate a json parser', function() {
        var json = parsers.getParser('json');
        expect(json).to.not.be.undefined();
    });

    it('fails when given an invalid JSON stream', function() {
        var json = parsers.getParser('json');
        return json.parseStream(fs.createReadStream(invalidFile), function() {})
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Error: Invalid JSON data');
        });
    });

    it('can parse a file with a single JSON point', function() {
        var json = parsers.getParser('json');
        var results = [];
        return json.parseStream(fs.createReadStream(pointFile), function(result) {
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

    it('can parse a file with multiple JSON points', function() {
        var json = parsers.getParser('json');
        var results = [];
        return json.parseStream(fs.createReadStream(pointsFile), function(result) {
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

    it('can parse a JSON object with nested arrays correctly', function() {
        var json = parsers.getParser('json');
        var results = [];
        return json.parseStream(fs.createReadStream(pointWithArrayFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(1);
            expect(results).to.deep.equal([[
                {
                    'time': '2014-01-01T00:00:00.000Z',
                    'foo': [
                        {'fizz1': 'buzz'},
                        {'fizz2': 'buzz'},
                        {'fizz3': 'buzz'}
                    ],
                    'bar': {
                        'baz': [
                            {'fizz1': 'buzz', 'contents': [1,2,3]},
                            {'fizz2': 'buzz', 'contents': [1,2,3]},
                            {'fizz3': 'buzz', 'contents': [1,2,3]}
                        ],
                        'bing': {'bang': 'object', 'bong': {'type': 'object'}}
                    }
                }
            ]]);
        });
    });

    it('can parse a nested array out of a JSON object using a rootPath path', function() {
        var json = parsers.getParser('json', {rootPath: 'foo'});
        var results = [];
        return json.parseStream(fs.createReadStream(pointWithArrayFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(1);
            expect(results).to.deep.equal([[
                {'fizz1': 'buzz'},
                {'fizz2': 'buzz'},
                {'fizz3': 'buzz'}
            ]]);
        });
    });

    it('can parse a nested array out of a JSON object using a multi-element rootPath path', function() {
        var json = parsers.getParser('json', {rootPath: 'bar.baz'});
        var results = [];
        return json.parseStream(fs.createReadStream(pointWithArrayFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(1);
            expect(results).to.deep.equal([[
                {'fizz1': 'buzz', 'contents': [1,2,3]},
                {'fizz2': 'buzz', 'contents': [1,2,3]},
                {'fizz3': 'buzz', 'contents': [1,2,3]}
            ]]);
        });
    });

    it('can parse a nested object out of a JSON object using a rootPath path', function() {
        var json = parsers.getParser('json', {rootPath: 'bar.bing'});
        var results = [];
        return json.parseStream(fs.createReadStream(pointWithArrayFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(1);
            expect(results).to.deep.equal([[
                {'bang': 'object', 'bong': {'type': 'object'}}
            ]]);
        });
    });

    it('can parse a JSON array with nested arrays correctly', function() {
        var json = parsers.getParser('json');
        var results = [];
        return json.parseStream(fs.createReadStream(pointsWithArrayFile), function(result) {
            results.push(result);
        })
        .then(function() {
            expect(results.length).equal(1);
            expect(results).to.deep.equal([[
                {
                    'time': '2014-01-01T00:00:00.000Z',
                    'foo': [ {'fizz1': 'buzz1'} ]
                },
                {
                    'time': '2014-01-01T00:00:01.000Z',
                    'foo': [ {'fizz2': 'buzz2'} ]
                }
            ]]);
        });
    });

    it('calls emit multiple times with payload limit specified', function() {
        var json = parsers.getParser('json', { limit: 1 });
        var results = [];
        return json.parseStream(fs.createReadStream(pointsFile), function(result) {
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
});

'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var fs = require('fs');
var parsers = require('../../../lib/adapters/parsers');
var serializers = require('../../../lib/adapters/serializers');
var path = require('path');
var tmp = require('tmp');

describe('parsers/csv', function() {
    var pointFile = path.resolve(__dirname, 'input/csv/point.csv');
    var pointsFile = path.resolve(__dirname, 'input/csv/points.csv');
    var invalidFile = path.resolve(__dirname, 'input/csv/invalid.csv');

    it('can instantiate a csv parser', function() {
        var csv = parsers.getParser('csv');
        expect(csv).to.not.be.undefined;
    });

    it('fails when given an invalid CSV stream', function() {
        var csv = parsers.getParser('csv');
        return csv.parseStream(fs.createReadStream(invalidFile), function() {})
        .then(function() {
            throw Error('previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Invalid CSV data: "1,2" at line 1 does not match header line');
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

    it('stops emitting values after the optimization.limit', function() {
        // the read ahead buffer of the parser will always read more points
        // that we actually want to parse but lets make sure this does not
        // read the whole file by writing out enough data
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        var serializer = serializers.getSerializer('csv', stream);

        for(var index = 0; index < 50; index++) {
            serializer.write([{
                time: new Date().toISOString(),
                index: index,
                fluff: Array(2048).join('X')
            }]);
        }

        return serializer.done()
        .then(() => {
            stream.end(function() {
                var csv = parsers.getParser('csv', {
                    optimization: {
                        type: 'head',
                        limit: 1
                    }
                });

                var results = [];
                return csv.parseStream(fs.createReadStream(tmpFilename), function(result) {
                    results.push(result);
                })
                .then(function() {
                    expect(results.length).to.be.equal(2); // 1 point + empty batch
                    expect(csv.totalRead).to.be.lessThan(40);
                    expect(csv.totalParsed).to.equal(2); // we always parse one ahead
                })
                .finally(function() {
                    fs.unlinkSync(tmpFilename);
                });
            });
        });
    });

    _.each({
        tsv: {
            separator: '\t'
        },
        csv: {
            separator: ','
        }
    }, (options, type) => {
        var pointFile = path.resolve(__dirname, `input/${type}/point.${type}`);
        var pointsFile = path.resolve(__dirname, `input/${type}/points.${type}`);
        var invalidFile = path.resolve(__dirname, `input/${type}/invalid.${type}`);

        it(`fails when given an invalid ${type} stream, with ${JSON.stringify(options)}`, () => {
            var csv = parsers.getParser('csv', options);
            return csv.parseStream(fs.createReadStream(invalidFile), () => {})
            .then(() => {
                throw Error('previous statement should have failed');
            })
            .catch((err) => {
                expect(err.toString()).to.contain('Error: Invalid CSV data');
            });
        });

        it(`can parse a file with a single ${type} point, with ${JSON.stringify(options)}`, () => {
            var csv = parsers.getParser('csv', options);
            var results = [];
            return csv.parseStream(fs.createReadStream(pointFile), (result) => {
                results.push(result);
            })
            .then(() => {
                expect(results).to.deep.equal([[
                    {
                        'time': '2014-01-01T00:00:00.000Z',
                        'foo': '1'
                    }
                ]]);
            });
        });

        it(`can parse a file with multiple ${type} points, with ${JSON.stringify(options)}`, () => {
            var csv = parsers.getParser('csv', options);
            var results = [];
            return csv.parseStream(fs.createReadStream(pointsFile), (result) => {
                results.push(result);
            })
            .then(() => {
                expect(results.length).equal(1);
                expect(results).to.deep.equal([[
                    { 'time': '2014-01-01T00:00:01.000Z', 'foo': '1' },
                    { 'time': '2014-01-01T00:00:02.000Z', 'foo': '2' },
                    { 'time': '2014-01-01T00:00:03.000Z', 'foo': '3' }
                ]]);
            });
        });
    });
});

'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var serializers = require('../../../lib/adapters/serializers');
var parsers = require('../../../lib/adapters/parsers');
var tmp = require('tmp');

describe('serializers/csv', function() {

    it('can instantiate a csv serializer', function() {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        var serializer = serializers.getSerializer('csv', stream);
        expect(serializer).to.not.be.undefined;
    });

    it('can write no points to a provided stream', function(done) {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        stream.on('open', function() {
            var serializer = serializers.getSerializer('csv', stream);
            serializer.done()
            .then(() => {
                stream.end(function(err) {
                    if (err) {
                        done(err);
                    }
                    expect(fs.readFileSync(tmpFilename).toString()).to.equal('');
                    done();
                });
            });
        });
    });

    it('fails when new fields appear in the stream', function(done) {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        var serializer = serializers.getSerializer('csv', stream);
        serializer
        .on('error', function(err) {
            expect(err.toString()).to.contain('Found new or missing fields: fizz');
            done();
        });
        serializer.write([{ foo: 'bar' }]);
        serializer.write([{ fizz: 'buzz' }]);
        serializer.done();
    });

    it('can write out a few points correctly', function(done) {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        stream.on('open', function() {
            var serializer = serializers.getSerializer('csv', stream);
            var data = [
                { time: '2014-01-01T00:00:00.000Z', foo: 'bar' },
                { time: '2014-02-01T00:00:00.000Z', foo: 'buzz' },
                { time: '2014-03-01T00:00:00.000Z', foo: 'bizz' }
            ];
            serializer.write(data);
            serializer.done()
            .then(() => {
                var parser = parsers.getParser('csv');
                var results = [];
                parser.parseStream(fs.createReadStream(tmpFilename), function(result) {
                    results.push(result);
                })
                .then(function() {
                    expect(results).to.deep.equal([data]);
                    done();
                })
                .catch(function(err) {
                    done(err);
                })
                .finally(function() {
                    fs.unlinkSync(tmpFilename);
                });
            });
        });
    });

    it('fails when you attempt to append without providing an input stream', function() {
        expect(function() {
            serializers.getSerializer('csv', undefined, { append: true });
        }).to.throw('internal error input stream must be provided when appending');
    });

    it('can append to an existing stream', function(done) {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        stream.on('open', () => {
            var serializer = serializers.getSerializer('csv', stream);
            serializer.write([{ time: '2014-01-01T00:00:00.000Z', foo: 'bar' }]);
            serializer.done()
            .then(() => {
                var aStream = fs.createWriteStream(tmpFilename, { flags: 'a' });
                var options = {
                    append: true,
                    input: fs.createReadStream(tmpFilename)
                };
                var serializer = serializers.getSerializer('csv', aStream, options);
                serializer.write([{ time: '2014-01-01T00:00:01.000Z', foo: 'bizz' }]);
                return serializer.done();
            })
            .then(() => {
                var parser = parsers.getParser('csv');
                var results = [];
                return parser.parseStream(fs.createReadStream(tmpFilename), (result) => {
                    results.push(result);
                })
                .then(() => {
                    expect(results).to.deep.equal([[
                        { time: '2014-01-01T00:00:00.000Z', foo: 'bar' },
                        { time: '2014-01-01T00:00:01.000Z', foo: 'bizz' }
                    ]]);
                    done();
                })
                .catch((err) => {
                    done(err);
                })
                .finally(() => {
                    fs.unlinkSync(tmpFilename);
                });
            });
        });
    });
});

'use strict';

var expect = require('chai').expect;
var fs = require('fs');
var parsers = require('../../../lib/adapters/parsers');
var serializers = require('../../../lib/adapters/serializers');
var tmp = require('tmp');

describe('serializers/json', function() {

    it('can instantiate a json serializer', function() {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        var serializer = serializers.getSerializer('json', stream);
        expect(serializer).to.not.be.undefined;
    });

    it('can write no points to a provided stream', function(done) {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        stream.on('open', function() {
            var serializer = serializers.getSerializer('json', stream);
            serializer.done()
            .then(() => {
                expect(fs.readFileSync(tmpFilename).toString()).to.equal('');
                done();
            });
        });
    });

    it('can write out a few points correctly', function(done) {
        var tmpFilename = tmp.tmpNameSync();
        var stream = fs.createWriteStream(tmpFilename);
        stream.on('open', function() {
            var serializer = serializers.getSerializer('json', stream);
            var data = [
                { time: '2014-01-01T00:00:00.000Z', foo: 'bar' },
                { time: '2014-02-01T00:00:00.000Z', foo: 'buzz' },
                { time: '2014-03-01T00:00:00.000Z', foo: 'bizz' }
            ];
            serializer.write(data);
            serializer.done()
            .then(() => {
                var results = [];
                var parser = parsers.getParser('json');
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

});

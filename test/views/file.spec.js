'use strict';

var expect = require('chai').expect;
var FileView = require('../../lib/views').FileView;
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var tmp = require('tmp');


describe('file view', function () {

    it('fails when no -filename specified', function() {
        expect(function() {
            new FileView({});
        }).to.throw('File views require a -filename argument');
    });

    it('default outputs JSON', function(done) {
        var filename = tmp.tmpNameSync();
        var file = new FileView({
            filename: filename
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        file.consume(data);
        file.eof();
        file.events.on('end', function() {
            return fs.readFileAsync(filename, 'utf8')
                .then(function(data) {
                    expect(JSON.parse(data)).to.deep.equal([
                        { time: '2014-01-01T00:00:01.000Z', value: 1},
                        { time: '2014-01-01T00:00:02.000Z', value: 2},
                        { time: '2014-01-01T00:00:03.000Z', value: 3},
                    ]);
                    done();
                }).catch(function(err){
                    done(err);
                });
        });
    });
});

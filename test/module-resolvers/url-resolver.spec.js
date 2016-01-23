'use strict';

var expect = require('chai').expect;
var express = require('express');
var Promise = require('bluebird');
var findFreePort = Promise.promisify(require('find-free-port'));
var URLResolver = require('../../lib/module-resolvers/url-resolver');

describe('url-resolver', function() {
    var app;
    var server;
    var url;
    var url_resolver;

    before(function() {
        url_resolver = new URLResolver();

        // startup the dummy HTTP server
        app = express();

        return findFreePort(10000, 20000)
        .then(function(port) {
            app.get('/module1.juttle', function (req, res) {
                res.send('// module1');
            });
            app.get('/bad_response.juttle', function (req, res) {
                res.status(400);
                res.end();
            });
            server = app.listen(port);
            url = 'http://localhost:' + port;
        });
    });

    after(function() {
        // shutdown the dummy HTTP server
        server.close();
    });

    it('fails when provided with non HTTP url', function() {
        return url_resolver.resolve('blah')
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Invalid URL: blah');
        });
    });

    it('fails when http server responds with non 200 status code', function() {
        return url_resolver.resolve(url + '/bad_response.juttle')
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Bad response resolving module');
        });
    });

    it('can resolve a juttle module from a URL', function() {
        return url_resolver.resolve(url + '/module1.juttle')
        .then(function(result) {
            expect(result.name).to.equal(url + '/module1.juttle');
            expect(result.source).to.equal('// module1');
        });
    });
});

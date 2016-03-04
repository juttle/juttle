'use strict';

var _ = require('underscore');
var Promise = require('bluebird');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var TestServer = require('./test-server');

var symmetricalFormats = {
    json: 'application/json',
    jsonl: 'application/jsonl',
    csv: 'text/csv'
};

describe('HTTP read tests', function() {
    let server;

    before(function() {
        server = new TestServer();
        server.start();
    });

    after(function() {
        server.stop();
    });

    it('fails when doing connecting to a bad port', function() {
        return check_juttle({
            program: 'read http -url "http://localhost:65535"'
        })
        .then((result) => {
            expect(result.errors.length).equal(1);
            expect(result.warnings).deep.equals([]);
            expect(result.errors[0]).to.contain('connect ECONNREFUSED');
        });
    });

    it('fails when doing connecting to invalid hostname', function() {
        return check_juttle({
            program: 'read http -url "http://no.mans.land.com"'
        })
        .then((result) => {
            expect(result.errors.length).equal(1);
            expect(result.warnings).deep.equals([]);
            expect(result.errors[0]).to.contain('getaddrinfo ENOTFOUND');
        });
    });

    it('fails when no -url provided', function() {
        return check_juttle({
            program: 'read http'
        })
        .then(function() {
            throw Error('The previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('missing read-http required option url');
        });
    });

    it('fails when -unknown provided', function() {
        return check_juttle({
            program: 'read http -unknown true -url "some_url"'
        })
        .then(function() {
            throw Error('The previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('unknown read-http option unknown.');
        });
    });

    _.each(['pageParam', 'pageUnit', 'pageStart', 'pageField'], (option) => {
        it('fails when using -followLinkHeader true with ' + option, function() {
            return check_juttle({
                program: `read http -url "some_url" -followLinkHeader true -${option} 0`
            })
            .then(function() {
                throw Error('The previous statement should have failed');
            })
            .catch(function(err) {
                expect(err.toString()).to.contain('-followLinkHeader option should not be combined with -' + option);
            });
        });
    });

    _.each(['request', 'record'], (unit) => {
        it(`can handle pageUnit "${unit}"`, () => {
            return check_juttle({
                program: `read http -pageUnit "${unit}" -url "${server.url}/status/200"`
            })
            .then((result) => {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table).to.deep.equal([]);
            });
        });
    });

    it(`can handle pageUnit "field"`, () => {
        return check_juttle({
            program: `read http -pageField "after" -url "${server.url}/status/200"`
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
            expect(result.sinks.table).to.deep.equal([]);
        });
    });

    it(`fails when both -pageField and -pageUnit are specified`, () => {
        return check_juttle({
            program: `read http -pageField "after" -pageUnit "record" -url "${server.url}/status/200"`
        })
        .then((result) => {
            throw Error('pageField combined with pageUnit succeeded when it should have failed');
        }).catch(function(err) {
            expect(err.toString()).to.contain('-pageField option should not be combined with -pageUnit');
        });
    });


    it('fails when unknown content-type received', function() {
        return check_juttle({
            program: 'read http -url "' + server.url + '/return-headers?content-type=banana"'
        })
        .then((result) => {
            expect(result.errors.length).equal(1);
            expect(result.warnings).deep.equals([]);
            expect(result.errors[0]).to.contain('Invalid format option value, must be one of the following: csv, json, jsonl');
        });
    });

    it('can use -method', function() {
        return Promise.map(['GET', 'POST', 'DELETE'], function(method) {
            return check_juttle({
                program: 'read http -method "' + method + '" -url "' + server.url + '/status/200"'
            })
            .then((result) => {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });
    });

    it('can use -headers to set headers', function() {
        return check_juttle({
            program: 'read http -headers { foo: "bar", fizz: "buzz" } ' +
                '               -url "' + server.url + '/headers?foo=bar&fizz=buzz"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
        });
    });

    it('can use -timeField to fix inbound data', function() {
        return check_juttle({
            program: 'read http -timeField "created_on" ' +
                '-url "' + server.url + '/points?count=1&timeField=created_on"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
            expect(result.sinks.table.length).equal(1);
            expect(result.sinks.table[0].time).to.not.be.undefined;
        });
    });

    it('can use -includeHeaders to tag each point with the inbound headers', function() {
        return check_juttle({
            program: 'read http -includeHeaders true -url "' + server.url + '/fake-data"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
            expect(result.sinks.table.length).equal(2);
            expect(result.sinks.table[0].etag).to.equal('12345');
            expect(result.sinks.table[0]['user-agent']).to.equal('fake-data');
            expect(result.sinks.table[1].etag).to.equal('12345');
            expect(result.sinks.table[1]['user-agent']).to.equal('fake-data');
        });
    });

    it('can use -rootPath to extract points from a nested field', function() {
        return check_juttle({
            program: 'read http -rootPath "wrapper" ' +
                '-url "' + server.url + '/points?count=5&rootPath=wrapper&timeField=time&key=val"'
        })
        .then((result) => {
            expect(result.sinks.table.length).equal(5);
            expect(result.sinks.table[0].key).equal('val');
            expect(result.sinks.table[0].time).is.defined;
        });
    });

    _.each(symmetricalFormats, function(contentType, name) {
        it('fails when response is not valid ' + name, function() {
            return check_juttle({
                program: 'read http -headers { Accept: "' + contentType + '"} -url "' + server.url + '/garbage"'
            })
            .then((result) => {
                expect(result.errors.length).equal(1);
                expect(result.warnings).deep.equals([]);
                expect(result.errors[0]).to.contain('Invalid ' + name.toUpperCase() + ' data');
            });
        });
    });

    _.each([
        { status: 400, message: 'Bad Request' },
        { status: 500, message: 'Internal Server Error' },
        { status: 404, message: 'Not Found' }
    ], function(response) {
        it('fails when response has status code of ' + response.status, function() {
            return check_juttle({
                program: 'read http -url "' + server.url + '/status/' + response.status + '"'
            })
            .then((result) => {
                expect(result.errors.length).equal(1);
                expect(result.warnings).deep.equals([]);
                expect(result.errors[0]).to.contain(`HTTP request failed with ${response.status}: ${response.message}`);
            });
        });
    });

    it('can read nothing back', function() {
        return check_juttle({
            program: 'read http -url "' + server.url + '/points?count=0"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
            expect(result.sinks.table.length).equal(0);
        });
    });

    _.each(symmetricalFormats, function(contentType, format) {
        it('can read timeless data point back with content-type: "' + contentType + '"', function() {
            return check_juttle({
                program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                '   -url "' + server.url + '/object?foo=bar"'
            })
            .then((result) => {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).equal(1);
                expect(result.sinks.table[0].foo).to.be.equal('bar');
            });
        });

        it('can read a data point with a time field with content-type: "' + contentType + '"', function() {
            return check_juttle({
                program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                '   -url "' + server.url + '/object?time=2014-01-01T00:00:00.000Z"'
            })
            .then((result) => {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).equal(1);
                expect(result.sinks.table[0].time).to.be.equal('2014-01-01T00:00:00.000Z');
            });
        });

        it('can read multiple data points with content-type: "' + contentType + '"', function() {
            return check_juttle({
                program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                '   -url "' + server.url + '/points?count=100&timeField=time&fizz=buzz"'
            })
            .then((result) => {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).equal(100);
                expect(result.sinks.table[0].time).to.not.be.undefined;
                expect(result.sinks.table[0].fizz).to.be.equal('buzz');
            });
        });

        it('can filter data points with content-type: "' + contentType + '" using -from/-to', function() {
            return check_juttle({
                program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                '   -url "' + server.url + '/points?count=10&from=2014-01-01T00:00:00.000Z&timeField=time"' +
                                '   -from :2014-01-01T00:00:03.000Z: -to :2014-01-01T00:00:06.000Z:'
            })
            .then((result) => {
                expect(result.errors.length).equal(0);
                expect(result.warnings.length).equal(0);
                expect(result.sinks.table).to.deep.equal([
                    { time: '2014-01-01T00:00:03.000Z' },
                    { time: '2014-01-01T00:00:04.000Z' },
                    { time: '2014-01-01T00:00:05.000Z' }
                ]);
            });
        });

        it('can override content-type using -format="' + format + '"', function() {
            return check_juttle({
                program: 'read http -headers { Accept: "' + contentType + '", "Return-Content-Type": "application/xml"} ' +
                            '          -format "' + format + '"' +
                            '          -url "' + server.url + '/points?count=100&timeField=time&fizz=buzz"'
            })
            .then((result) => {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).equal(100);
                expect(result.sinks.table[0].time).to.not.be.undefined;
                expect(result.sinks.table[0].fizz).to.be.equal('buzz');
            });
        });

    });

    it('fails when you pass a filter expression', function() {
        var url = server.url + '/points?count=10&timeField=time&from=2014-01-01T00:00:00.000Z';
        return check_juttle({
            program: 'read http -url "' + url + '" ' +
                'foo="bar"'
        })
        .then(function() {
            throw Error('The previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('filtering is not supported by read http');
        });
    });

    it('can follow the link header when told to', function() {
        return check_juttle({
            program: `read http -url "${server.url}/linked" -followLinkHeader true`,
            deactivateAfter: 250
        })
        .then((result) => {
            expect(result.errors).to.deep.equal([]);
            expect(result.warnings).to.deep.equal([]);
            expect(result.sinks.table).to.deep.equal([
                { page: 1, index: 0 },
                { page: 2, index: 0 },
                { page: 3, index: 0 },
                { page: 4, index: 0 },
                { page: 5, index: 0 }
            ]);
        });
    });

    it('can handle record based pagination', function() {
        return check_juttle({
            program: `read http -url "${server.url}/pageByRecord?limit=2" ` +
                                '-pageParam "offset" ' +
                                '-pageUnit "record" ' +
                                '-pageStart 0',
            deactivateAfter: 250
        })
        .then((result) => {
            expect(result.errors).to.deep.equal([]);
            expect(result.warnings).to.deep.equal([]);
            expect(result.sinks.table).to.deep.equal([
                { index: 0 },
                { index: 1 },
                { index: 2 },
                { index: 3 },
                { index: 4 }
            ]);
        });
    });

    it('can handle request based pagination', function() {
        return check_juttle({
            program: `read http -url "${server.url}/pageByRequest" ` +
                                '-pageParam "page" ' +
                                '-pageUnit "request" ' +
                                '-pageStart 1',
            deactivateAfter: 250
        })
        .then((result) => {
            expect(result.errors).to.deep.equal([]);
            expect(result.warnings).to.deep.equal([]);
            expect(result.sinks.table).to.deep.equal([
                { page: 1, index: 0 },
                { page: 2, index: 0 },
                { page: 3, index: 0 },
                { page: 4, index: 0 },
                { page: 5, index: 0 }
            ]);
        });
    });

    it('can handle field based pagination', function() {
        return check_juttle({
            program: `read http -url "${server.url}/pageByField?limit=2" ` +
                                '-pageParam "after" ' +
                                '-pageField "index" '
        })
        .then((result) => {
            expect(result.errors).to.deep.equal([]);
            expect(result.warnings).to.deep.equal([]);
            expect(result.sinks.table).to.deep.equal([
                { index: 0 },
                { index: 1 },
                { index: 2 },
                { index: 3 },
                { index: 4 }
            ]);
        });
    });

    it('can handle field based pagination when results have no values for -pageField', function() {
        return check_juttle({
            program: `read http -url "${server.url}/pageByField?limit=2" ` +
                                '-pageParam "after" ' +
                                '-pageField "nofield" '
        })
        .then((result) => {
            expect(result.errors).to.deep.equal([]);
            expect(result.warnings.length).to.equal(1);
            expect(result.warnings).to.deep.equal(['internal error Last point in results did not contain a "nofield" field -- ending pagination']);
            expect(result.sinks.table).to.deep.equal([
                { index: 0 },
                { index: 1 }
            ]);
        });
    });

    it('will ignore the link header by default', function() {
        return check_juttle({
            program: `read http -url "${server.url}/linked"`
        })
        .then((result) => {
            expect(result.errors).to.deep.equal([]);
            expect(result.warnings).to.deep.equal([]);
            expect(result.sinks.table).to.deep.equal([
                { page: 1, index: 0 }
            ]);
        });
    });

    describe('optimizations', function() {
        _.each(symmetricalFormats, function(contentType, name) {
            it('fails to optimize tail followed by head with -format "' + name + '"', function() {
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                    '   -url "' + server.url + '/objects?foo=bar&count=100" | tail 1 | head 1'
                })
                .then((result) => {
                    expect(result.errors.length).to.be.equal(0);
                    expect(result.warnings.length).to.be.equal(0);
                    expect(result.sinks.table.length).to.be.equal(1);
                    expect(result.prog.graph.readState.parser.stopAt).to.equal(Number.POSITIVE_INFINITY);
                    expect(result.prog.graph.readState.parser.totalRead).to.equal(100);
                    expect(result.prog.graph.readState.parser.totalParsed).to.equal(100);
                });
            });

            it('can optimize "| head 1" with -format "' + name + '"', function() {
                // the read ahead buffer of the parser will always read more points
                // that we actually want to parse but lets make sure this does not
                // read the whole stream by making a big enough payload over http
                // that we know the parser won't read ahead the totality of the
                // points
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} ' +
                             '          -url "' + server.url + '/objects?foo=' +
                             Array(2048).join('X') + '&count=100" | head 1'
                })
                .then((result) => {
                    expect(result.errors.length).to.be.equal(0);
                    expect(result.warnings.length).to.be.equal(0);
                    expect(result.sinks.table.length).to.be.equal(1);
                    expect(result.prog.graph.readState.parser.stopAt).to.equal(1);
                    expect(result.prog.graph.readState.parser.totalRead).to.be.lessThan(50);
                    expect(result.prog.graph.readState.parser.totalParsed).to.equal(2);
                });
            });

            it('can optimize nested "| head 2 | head 1" with -format "' + name + '"', function() {
                // the read ahead buffer of the parser will always read more points
                // that we actually want to parse but lets make sure this does not
                // read the whole stream by making a big enough payload over http
                // that we know the parser won't read ahead the totality of the
                // points
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} ' +
                             '          -url "' + server.url + '/objects?foo=' +
                             Array(2048).join('X') + '&count=100" | head 2 | head 1'
                })
                .then((result) => {
                    expect(result.errors.length).to.be.equal(0);
                    expect(result.warnings.length).to.be.equal(0);
                    expect(result.sinks.table.length).to.be.equal(1);
                    expect(result.prog.graph.readState.parser.stopAt).to.equal(1);
                    expect(result.prog.graph.readState.parser.totalRead).to.be.lessThan(50);
                    expect(result.prog.graph.readState.parser.totalParsed).to.equal(2);
                });
            });
        });
    });
});

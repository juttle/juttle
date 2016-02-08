'use strict';

var _ = require('underscore');
var Promise = require('bluebird');
var bodyParser = require('body-parser');
var contentType = require('content-type');
var expect = require('chai').expect;
var express = require('express');
var findFreePort = Promise.promisify(require('find-free-port'));
var juttle_test_utils = require('../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var json2csv = require('json2csv');

var symmetricalFormats = {
    json: 'application/json',
    jsonl: 'application/jsonl',
    csv: 'text/csv'
};

describe('HTTP adapter tests', function() {

    before(function() {
        // startup the dummy HTTP server
        var self = this;
        this.store = {};
        this.app = express();
        this.app.use(bodyParser.json());

        return findFreePort(10000, 20000)
        .then(function(port) {
            self.app.get('/garbage', function (req, res) {
                res.set('content-type', req.headers['accept']);
                res.send('one,two\none,two,three');
            });

            self.app.get('/fake-data', function (req, res) {
                res.set('ETag', '12345');
                res.set('User-Agent', 'fake-data');
                res.set('Content-Type', 'application/json');

                res.send([{
                    time: '2015-01-01T00:00:00.000Z',
                    name: 'response_ms',
                    value: 250
                },
                {
                    time: '2015-01-01T00:01:00.000Z',
                    name: 'duration_ms',
                    value: 100
                }]);
            });

            self.app.post('/auth', function (req, res) {
                /*
                 * silly auth end point that will only respond with:
                 *
                 *  { authorized: true }
                 *
                 * if you send it a POST with the body:
                 *
                 *  { username: 'root', password: 'bananas' }
                 */
                if (req.body.username === 'root' && req.body.password === 'bananas') {
                    res.status(200).end('{ "authorized": true }');
                } else {
                    res.status(401).end();
                }
            });

            self.app.all('/flakey', function (req, res) {
                /*
                 * uses the field "fail" to dictate if the request should fail
                 * or not
                 */
                if (req.body.fail) {
                    res.status(500).end();
                } else {
                    res.status(200).end();
                }
            });

            self.app.get('/object', function (req, res) {
                /*
                 * returns a single JSON object (not in a JSON array) where the
                 * fields come from the query parameters sent in the request
                 */
                var point = {};
                _.each(req.query, function(value, key) {
                    point[key] = value;
                });

                var contentTypeHeader = req.header('Accept');
                var type;
                if (contentTypeHeader) {
                    type = contentType.parse(contentTypeHeader).type;
                }

                if (type === 'text/csv') {
                    json2csv({
                        data: point,
                        fields: _.keys(point)
                    }, function(err, csv) {
                        if (err) {
                            throw err;
                        }

                        res.set('Content-Type', 'text/csv');
                        res.send(csv);
                    });
                } else {
                    // default to JSON
                    res.set('Content-Type', type);
                    res.send(point);
                }
            });

            self.app.get('/objects', function (req, res) {
                /*
                 * returns a set of objects with the specified content-type
                 */
                var points = [];
                var count = parseInt(req.query.count);
                delete req.query.count;

                for(var index = 0; index < count; index++) {
                    var point = {};
                    _.each(req.query, function(value, key) {
                        point[key] = value;
                    });
                    points.push(point);
                }

                var contentTypeHeader = req.header('Accept');
                var type;
                if (contentTypeHeader) {
                    type = contentType.parse(contentTypeHeader).type;
                }

                if (type === 'text/csv') {
                    json2csv({
                        data: points,
                        fields: _.keys(point)
                    }, function(err, csv) {
                        if (err) {
                            throw err;
                        }

                        res.set('Content-Type', 'text/csv');
                        res.send(csv);
                    });
                } else if (type === 'application/jsonl') {
                    var buffer = [];
                    res.set('Content-Type', 'application/jsonl');
                    _.each(points, function(point) {
                        buffer.push(JSON.stringify(point));
                    });
                    res.send(buffer.join('\n'));
                } else if (type === 'application/json') {
                    // default to JSON
                    res.set('Content-Type', type);
                    res.send(points);
                } else {
                    res.status(500);
                    res.end();
                }
            });

            self.app.get('/points', function (req, res) {
                /*
                * creates points based off query parameters supplied:
                *
                * count: number of points to create
                * timeField: name of to put the ISO 8601 timestamp in
                * from: ISO 8601 timestamp to start the timestamps at, default :now:
                * every: seconds between each point, default: 1
                * rootPath: add a wrapper object with the given key
                *
                */
                var points = [];
                var timeField = req.query.timeField;
                var count = req.query.count;
                var from = req.query.from ? new Date(req.query.from) : new Date();
                var every = req.query.every ? parseInt(req.query.every) : 1;
                var rootPath = req.query.rootPath;

                var now = from;
                for (var index = 0; index < parseInt(count); index++) {
                    var point = {};

                    // copy all fields except timeField and count to each point
                    _.each(req.query, function(value, key, obj) {
                        if (['timeField', 'count', 'from', 'every', 'rootPath'].indexOf(key) === -1) {
                            point[key] = value;
                        }
                    });

                    // if no timeField is provided then generate timeless points
                    if (timeField) {
                        point[timeField] = now.toISOString();
                        now = new Date(now.getTime() + (every*1000));
                    }

                    points.push(point);
                }

                var contentTypeHeader = req.header('Accept');
                var type;
                if (contentTypeHeader) {
                    type = contentType.parse(contentTypeHeader).type;
                }

                if (type === 'text/csv') {
                    json2csv({
                        data: points,
                        fields: _.keys(points[0])
                    }, function(err, csv) {
                        if (err) {
                            throw err;
                        }

                        if (req.headers['return-content-type']) {
                            res.set('Content-Type', req.headers['return-content-type']);
                        } else {
                            res.set('Content-Type', 'text/csv');
                        }
                        res.send(csv);
                    });
                } else if (type === 'application/jsonl') {
                    var buffer = [];
                    if (req.headers['return-content-type']) {
                        res.set('Content-Type', req.headers['return-content-type']);
                    } else {
                        res.set('Content-Type', 'application/jsonl');
                    }
                    _.each(points, function(point) {
                        buffer.push(JSON.stringify(point));
                    });
                    res.send(buffer.join('\n'));
                } else {
                    // default to JSON
                    if (req.headers['return-content-type']) {
                        res.set('Content-Type', req.headers['return-content-type']);
                    } else {
                        res.set('Content-Type', 'application/json');
                    }

                    // add a wrapper object if requested
                    if (rootPath) {
                        var obj = {};
                        obj[rootPath] = points;
                        points = obj;
                    }
                    res.send(points);
                }
            });

            self.app.put('/accept-object', function (req, res) {
                if (_.isArray(req.body)) {
                    res.status(400);
                } else {
                    res.status(200);
                }
                res.end();
            });

            self.app.put('/points', function (req, res) {
                /*
                * verifies the points received equals the query parameter 'expect'
                */
                var body = req.body;
                var count = 0;

                if (body.length) {
                    count = body.length;
                } else {
                    count = 1;
                }

                if (count === parseInt(req.query.expect)) {
                    res.set('Content-Type', 'application/json');
                    res.status(200);
                } else {
                    res.status(500);
                }
                res.end();
            });

            self.app.all('/status/:status', function(req, res) {
                if (req.params.status) {
                    res.status(parseInt(req.params.status));
                    res.set('Content-Type', 'application/json');
                    res.send([]);
                } else {
                    res.set('Content-Type', 'application/json');
                    res.send([]);
                }
            });

            self.app.all('/return-headers', function(req, res) {
                _.each(req.query, function(value, key) {
                    res.append(key, value);
                });
                res.end();
            });

            self.app.all('/headers', function(req, res) {
                var allFound = true;

                _.each(req.query, function(value, key) {
                    if (req.header(key) !== value) {
                        allFound = false;
                    }
                });

                if (allFound) {
                    res.set('content-type', 'application/json');
                    res.status(200);
                    res.end('[]');
                } else {
                    res.status(500);
                    res.end();
                }
            });

            self.app.put('/body', function(req, res) {
                /*
                * parse the body and compare every field in the body to every
                * query parameter passed with self request.
                */
                var allFound = true;
                var body;

                if (req.body.length) {
                    body = req.body[0];
                } else {
                    body = req.body;
                }

                _.each(req.query, function(value, key) {
                    if (value !== ('' + body[key])) {
                        allFound = false;
                    }
                });

                if (allFound) {
                    res.set('Content-Type', 'application/json');
                    res.status(200);
                    res.end('[]');
                } else {
                    res.status(500);
                    res.end();
                }
            });

            self.server = self.app.listen(port);
            self.url = 'http://localhost:' + port;
        });
    });

    after(function() {
        // shutdown the dummy HTTP server
        this.server.close();
    });

    describe('read http', function() {
        it('fails when doing connecting to a bad port', function() {
            return check_juttle({
                program: 'read http -url "http://localhost:65535"'
            })
            .then(function(result) {
                expect(result.errors.length).equal(1);
                expect(result.warnings).deep.equals([]);
                expect(result.errors[0]).to.contain('connect ECONNREFUSED');
            });
        });

        it('fails when doing connecting to invalid hostname', function() {
            return check_juttle({
                program: 'read http -url "http://no.mans.land.com"'
            })
            .then(function(result) {
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
                expect(err.toString()).to.contain('missing read http required option url');
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

        it('fails when unknown content-type received', function() {
            var self = this;
            return check_juttle({
                program: 'read http -url "' + self.url + '/return-headers?content-type=banana"'
            })
            .then(function(result) {
                expect(result.errors.length).equal(1);
                expect(result.warnings).deep.equals([]);
                expect(result.errors[0]).to.contain('Invalid format option value, must be one of the following: csv, json, jsonl');
            });
        });

        it('can use -method', function() {
            var self = this;
            return Promise.map(['GET', 'POST', 'DELETE'], function(method) {
                return check_juttle({
                    program: 'read http -method "' + method + '" -url "' + self.url + '/status/200"'
                })
                .then(function(result) {
                    expect(result.errors).deep.equals([]);
                    expect(result.warnings).deep.equals([]);
                });
            });
        });

        it('can use -headers to set headers', function() {
            var self = this;
            return check_juttle({
                program: 'read http -headers { foo: "bar", fizz: "buzz" } ' +
                    '               -url "' + self.url + '/headers?foo=bar&fizz=buzz"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });

        it('can use -timeField to fix inbound data', function() {
            return check_juttle({
                program: 'read http -timeField "created_on" ' +
                    '-url "' + this.url + '/points?count=1&timeField=created_on"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).equal(1);
                expect(result.sinks.table[0].time).to.not.be.undefined;
            });
        });

        it('can use -includeHeaders to tag each point with the inbound headers', function() {
            return check_juttle({
                program: 'read http -includeHeaders true -url "' + this.url + '/fake-data"'
            })
            .then(function(result) {
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
                    '-url "' + this.url + '/points?count=5&rootPath=wrapper&timeField=time&key=val"'
            })
            .then(function(result) {
                expect(result.sinks.table.length).equal(5);
                expect(result.sinks.table[0].key).equal('val');
                expect(result.sinks.table[0].time).is.defined;
            });
        });

        _.each(symmetricalFormats, function(contentType, name) {
            it('fails when response is not valid ' + name, function() {
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} -url "' + this.url + '/garbage"'
                })
                .then(function(result) {
                    expect(result.errors.length).equal(1);
                    expect(result.warnings).deep.equals([]);
                    expect(result.errors[0]).to.contain('Invalid ' + name.toUpperCase() + ' data');
                });
            });
        });

        _.each([400, 500], function(status) {
            it('fails when response has status code of ' + status, function() {
                return check_juttle({
                    program: 'read http -url "' + this.url + '/status/' + status + '"'
                })
                .then(function(result) {
                    expect(result.errors.length).equal(1);
                    expect(result.warnings).deep.equals([]);
                    expect(result.errors[0]).to.contain('internal error StatusCodeError: ' + status);
                });
            });
        });

        it('can read nothing back', function() {
            return check_juttle({
                program: 'read http -url "' + this.url + '/points?count=0"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table.length).equal(0);
            });
        });

        _.each(symmetricalFormats, function(contentType, format) {
            it('can read timeless data point back with content-type: "' + contentType + '"', function() {
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                    '   -url "' + this.url + '/object?foo=bar"'
                })
                .then(function(result) {
                    expect(result.errors).deep.equals([]);
                    expect(result.warnings).deep.equals([]);
                    expect(result.sinks.table.length).equal(1);
                    expect(result.sinks.table[0].foo).to.be.equal('bar');
                });
            });

            it('can read a data point with a time field with content-type: "' + contentType + '"', function() {
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                    '   -url "' + this.url + '/object?time=2014-01-01T00:00:00.000Z"'
                })
                .then(function(result) {
                    expect(result.errors).deep.equals([]);
                    expect(result.warnings).deep.equals([]);
                    expect(result.sinks.table.length).equal(1);
                    expect(result.sinks.table[0].time).to.be.equal('2014-01-01T00:00:00.000Z');
                });
            });

            it('can read multiple data points with content-type: "' + contentType + '"', function() {
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                    '   -url "' + this.url + '/points?count=100&timeField=time&fizz=buzz"'
                })
                .then(function(result) {
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
                                    '   -url "' + this.url + '/points?count=10&from=2014-01-01T00:00:00.000Z&timeField=time"' +
                                    '   -from :2014-01-01T00:00:03.000Z: -to :2014-01-01T00:00:06.000Z:'
                })
                .then(function(result) {
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
                             '          -url "' + this.url + '/points?count=100&timeField=time&fizz=buzz"'
                })
                .then(function(result) {
                    expect(result.errors).deep.equals([]);
                    expect(result.warnings).deep.equals([]);
                    expect(result.sinks.table.length).equal(100);
                    expect(result.sinks.table[0].time).to.not.be.undefined;
                    expect(result.sinks.table[0].fizz).to.be.equal('buzz');
                });
            });

        });

        it('fails when you pass a filter expression', function() {
            var url = this.url + '/points?count=10&timeField=time&from=2014-01-01T00:00:00.000Z';
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

    });

    describe('write http', function() {

        it('fails when no -url provided', function() {
            return check_juttle({
                program: 'emit -limit 1 | write http'
            })
            .then(function() {
                throw Error('The previous statement should have failed');
            })
            .catch(function(err) {
                expect(err.toString()).to.contain('missing write http required option url');
            });
        });

        it('fails when -unknown provided', function() {
            return check_juttle({
                program: 'emit -limit 1 | write http -unknown true -url "some_url"'
            })
            .then(function() {
                throw Error('The previous statement should have failed');
            })
            .catch(function(err) {
                expect(err.toString()).to.contain('unknown write-http option unknown.');
            });
        });

        it('can write with -method', function() {
            var self = this;
            Promise.map(['GET', 'POST', 'DELETE'], function(method) {
                return check_juttle({
                    program: 'emit -limit 1 ' +
                        '| write http -method "' + method + '" ' +
                        '              -url "' + self.url + '/status/200"'
                })
                .then(function(result) {
                    expect(result.errors).deep.equals([]);
                    expect(result.warnings).deep.equals([]);
                });
            });
        });

        it('can use -headers to set headers', function() {
            var self = this;
            return check_juttle({
                program: 'emit -limit 1 ' +
                    '| write http -headers { "foo":"bar", "fizz":"buzz" } ' +
                    '              -url "' + self.url + '/headers?foo=bar&fizz=buzz"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });

        it('fails when response is non 200', function() {
            return check_juttle({
                program: 'emit -limit 1 | write http -url "' + this.url + '/status/500"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings.length).equal(1);
                expect(result.warnings[0]).to.contain('internal error StatusCodeError: 500');
            });
        });

        it('can write with intermittent failures', function() {
            return check_juttle({
                program: 'emit -limit 10' +
                    '| put value = count(), fail = (value % 2 == 0) ' +
                    '| write http -url "' + this.url + '/flakey"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings.length).equal(5);
            });
        });

        it('can write nothing out', function() {
            return check_juttle({
                // status/500 because if we do write out anything we should fail
                program: 'emit -limit 1 | filter banana=true | write http -url "' + this.url + '/status/500"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
                expect(result.sinks.table).to.be.undefined;
            });
        });

        it('can write a timeless data point out', function() {
            return check_juttle({
                program: 'emit -limit 1 ' +
                    '| remove time ' +
                    '| put value=count(), name="field-${value}"' +
                    '| write http -method "PUT" -url "' + this.url + '/body?value=1&name=field-1"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });

        it('can write a data point with a time field', function() {
            return check_juttle({
                program: 'emit -limit 1 -from :2015-01-01T00:00:00.000Z:' +
                    '| put value=count(), name="field-${value}"' +
                    '| write http -method "PUT" -url "' + this.url + '/body?time=2015-01-01T00:00:00.000Z&value=1&name=field-1"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });

        it('can write a stream of data points', function() {
            return check_juttle({
                program: 'emit -limit 100 ' +
                    '| put value=count(), name="field-${value}"' +
                    // expect 1 written at a time as that is the default
                    '| write http -method "PUT" -url "' + this.url + '/points?expect=1"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });

        it('can send a single JSON object when  maxLength set to 1', function() {
            return check_juttle({
                program: 'read http -url "' + this.url + '/points?count=10"' +
                    '| put value=count(), name="field-${value}"' +
                    '| write http -method "PUT" -url "' + this.url + '/accept-object"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });

        it('can write a stream of data points with -maxLength 10', function() {
            return check_juttle({
                // emit pushes a 1 point a time through the juttle pipeline so
                // doesn't work well here for testing maxLength
                program: 'read http -url "' + this.url + '/points?count=100"' +
                    '| put value=count(), name="field-${value}"' +
                    '| write http -maxLength 10 -method "PUT" -url "' + this.url + '/points?expect=10"'
            })
            .then(function(result) {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });
    });

    describe('optimizations', function() {
        _.each(symmetricalFormats, function(contentType, name) {
            it('fails to optimize tail followed by head with -format "' + name + '"', function() {
                return check_juttle({
                    program: 'read http -headers { Accept: "' + contentType + '"} ' +
                                    '   -url "' + this.url + '/objects?foo=bar&count=100" | tail 1 | head 1'
                })
                .then(function(result) {
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
                             '          -url "' + this.url + '/objects?foo=' +
                             Array(2048).join('X') + '&count=100" | head 1'
                })
                .then(function(result) {
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
                             '          -url "' + this.url + '/objects?foo=' +
                             Array(2048).join('X') + '&count=100" | head 2 | head 1'
                })
                .then(function(result) {
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

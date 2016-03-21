'use strict';

var _ = require('underscore');
var Promise = require('bluebird');
var bodyParser = require('body-parser');
var contentType = require('content-type');
var express = require('express');
var findFreePort = Promise.promisify(require('find-free-port'));
var json2csv = require('json2csv');

class TestHTTPServer {

    constructor() {
        this.store = {};
        this.app = express();
        this.app.use(bodyParser.json());
    }

    start() {
        return findFreePort(10000, 20000)
        .then((port) => {
            this.app.get('/garbage', (req, res) => {
                res.set('content-type', req.headers['accept']);
                res.send('one,two\none,two,three');
            });

            this.app.get('/fake-data', (req, res) => {
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

            this.app.post('/auth', (req, res) => {
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

            this.app.all('/flakey', (req, res) => {
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

            this.app.get('/object', (req, res) => {
                /*
                * returns a single JSON object (not in a JSON array) where the
                * fields come from the query parameters sent in the request
                */
                var point = {};
                _.each(req.query, (value, key) => {
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
                    }, (err, csv) => {
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

            this.app.get('/objects', (req, res) => {
                /*
                * returns a set of objects with the specified content-type
                */
                var points = [];
                var count = parseInt(req.query.count);
                delete req.query.count;

                for(var index = 0; index < count; index++) {
                    var point = {};
                    _.each(req.query, (value, key) => {
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
                    }, (err, csv) => {
                        if (err) {
                            throw err;
                        }

                        res.set('Content-Type', 'text/csv');
                        res.send(csv);
                    });
                } else if (type === 'application/jsonl') {
                    var buffer = [];
                    res.set('Content-Type', 'application/jsonl');
                    _.each(points, (point) => {
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

            this.app.get('/points', (req, res) => {
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
                var count = parseInt(req.query.count);
                var from = req.query.from ? new Date(req.query.from) : new Date();
                var every = req.query.every ? parseInt(req.query.every) : 1;
                var rootPath = req.query.rootPath;

                var now = from;
                for (var index = 0; index < count; index++) {
                    var point = {};

                    // copy all fields except timeField and count to each point
                    _.each(req.query, (value, key, obj) => {
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
                    }, (err, csv) => {
                        if (err) {
                            throw err;
                        }

                        if (req.headers['insertline'] !== undefined) {
                            // insert the specified line into the CSV data
                            // at a few locations
                            var line = req.headers['insertline'];
                            var lines = csv.split('\n');
                            lines.splice(count/2, 0, line);
                            lines.splice(count, 0, line);
                            lines.splice(count/4, 0, line);
                            csv = lines.join('\n');
                        }

                        if (req.headers['separatorchar'] !== undefined) {
                            csv = csv.replace(/,/g, req.headers['separatorchar']);
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
                    _.each(points, (point) => {
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

            this.app.put('/accept-object', (req, res) => {
                if (_.isArray(req.body)) {
                    res.status(400);
                } else {
                    res.status(200);
                }
                res.end();
            });

            this.app.put('/points', (req, res) => {
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

            this.app.all('/status/:status', (req, res) => {
                if (req.params.status) {
                    res.status(parseInt(req.params.status));
                    res.set('Content-Type', 'application/json');
                    res.send([]);
                } else {
                    res.set('Content-Type', 'application/json');
                    res.send([]);
                }
            });

            this.app.all('/return-headers', (req, res) => {
                _.each(req.query, (value, key) => {
                    res.append(key, value);
                });
                res.end();
            });

            this.app.all('/headers', (req, res) => {
                var allFound = true;

                _.each(req.query, (value, key) => {
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

            this.app.put('/body', (req, res) => {
                /*
                * parse the body and compare every field in the body to every
                * query parameter passed with this request.
                */
                var allFound = true;
                var body;

                if (req.body.length) {
                    body = req.body[0];
                } else {
                    body = req.body;
                }

                _.each(req.query, (value, key) => {
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

            this.app.get('/pageByRequest', (req, res) => {
                // returns 5 pages with 1 point at a time
                var page;
                if (req.query['page']) {
                    page = parseInt(req.query.page);
                }

                res.set('Content-Type', 'application/json');
                res.status(200);
                if (page <= 5 ) {
                    var data = [{ page: page, index: 0 }];
                    res.end(JSON.stringify(data));
                } else {
                    res.end('[]');
                }
            });

            this.app.get('/pageByRecord', (req, res) => {
                // returns 5 records based on the record count and limit parameter
                var offset = parseInt(req.query['offset']);
                var limit = parseInt(req.query['limit']);

                var left = 5 - offset;
                res.set('Content-Type', 'application/json');
                res.status(200);

                if (left < 0) {
                    res.end('[]');
                } else {
                    var data = [];

                    if (left < limit) {
                        limit = left;
                    }

                    for (var index = 0; index < limit; index++) {
                        data.push({ index: offset + index});
                    }

                    res.end(JSON.stringify(data));
                }
            });

            this.app.get('/pageByField', (req, res) => {
                // returns 5 records with index > after subject to the limit parameter
                var offset = 0;
                var limit = parseInt(req.query['limit']);

                if (_.has(req.query, 'after')) {
                    offset = parseInt(req.query['after']) + 1;
                }

                var left = 5 - offset;
                res.set('Content-Type', 'application/json');
                res.status(200);

                if (left < 0) {
                    res.end('[]');
                } else {
                    var data = [];

                    if (left < limit) {
                        limit = left;
                    }

                    for (var index = 0; index < limit; index++) {
                        data.push({ index: offset + index});
                    }

                    res.end(JSON.stringify(data));
                }
            });

            this.app.get('/linked', (req, res) => {
                // returns 5 pages with 1 point at a time and provides the
                // `Link` header needed to get the subsequent elements
                var page = 0;
                var next = 1;
                if (req.query['page']) {
                    page = parseInt(req.query.page);
                    next = page + 1;
                }

                if (next < 5) {
                    res.set('Link', '<' + this.url + '/linked?page=' + next + '>; rel="next"');
                }

                res.set('Content-Type', 'application/json');
                if (page < 5 ) {
                    var data = [{ page: next, index: 0 }];
                    res.status(200);
                    res.end(JSON.stringify(data));
                } else {
                    res.status(400);
                }
            });

            this.server = this.app.listen(port);
            this.url = 'http://localhost:' + port;
        });
    }

    stop() {
        this.server.close();
    }
}

module.exports = TestHTTPServer;


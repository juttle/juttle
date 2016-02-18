'use strict';

var Promise = require('bluebird');
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var TestServer = require('./test-server');

describe('HTTP write tests', () => {
    let server;

    before(() => {
        server = new TestServer();
        server.start();
    });

    after(() => {
        server.stop();
    });


    it('fails when no -url provided', () => {
        return check_juttle({
            program: 'emit -limit 1 | write http'
        })
        .then(() => {
            throw Error('The previous statement should have failed');
        })
        .catch((err) => {
            expect(err.toString()).to.contain('missing write-http required option url');
        });
    });

    it('fails when -unknown provided', () => {
        return check_juttle({
            program: 'emit -limit 1 | write http -unknown true -url "some_url"'
        })
        .then(() => {
            throw Error('The previous statement should have failed');
        })
        .catch((err) => {
            expect(err.toString()).to.contain('unknown write-http option unknown.');
        });
    });

    it('can write with -method', () => {
        Promise.map(['GET', 'POST', 'DELETE'], (method) => {
            return check_juttle({
                program: 'emit -limit 1 ' +
                    '| write http -method "' + method + '" ' +
                    '              -url "' + server.url + '/status/200"'
            })
            .then((result) => {
                expect(result.errors).deep.equals([]);
                expect(result.warnings).deep.equals([]);
            });
        });
    });

    it('can use -headers to set headers', () => {
        return check_juttle({
            program: 'emit -limit 1 ' +
                '| write http -headers { "foo":"bar", "fizz":"buzz" } ' +
                '              -url "' + server.url + '/headers?foo=bar&fizz=buzz"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
        });
    });

    it('fails when response is non 200', () => {
        return check_juttle({
            program: 'emit -limit 1 | write http -url "' + server.url + '/status/500"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings.length).equal(1);
            expect(result.warnings[0]).to.contain('internal error StatusCodeError: 500');
        });
    });

    it('can write with intermittent failures', () => {
        return check_juttle({
            program: 'emit -limit 10' +
                '| put value = count(), fail = (value % 2 == 0) ' +
                '| write http -url "' + server.url + '/flakey"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings.length).equal(5);
        });
    });

    it('can write nothing out', () => {
        return check_juttle({
            // status/500 because if we do write out anything we should fail
            program: 'emit -limit 1 | filter banana=true | write http -url "' + server.url + '/status/500"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
            expect(result.sinks.table).to.be.undefined;
        });
    });

    it('can write a timeless data point out', () => {
        return check_juttle({
            program: 'emit -limit 1 ' +
                '| remove time ' +
                '| put value=count(), name="field-${value}"' +
                '| write http -method "PUT" -url "' + server.url + '/body?value=1&name=field-1"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
        });
    });

    it('can write a data point with a time field', () => {
        return check_juttle({
            program: 'emit -limit 1 -from :2015-01-01T00:00:00.000Z:' +
                '| put value=count(), name="field-${value}"' +
                '| write http -method "PUT" -url "' + server.url + '/body?time=2015-01-01T00:00:00.000Z&value=1&name=field-1"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
        });
    });

    it('can write a stream of data points', () => {
        return check_juttle({
            program: 'emit -limit 100 ' +
                '| put value=count(), name="field-${value}"' +
                // expect 1 written at a time as that is the default
                '| write http -method "PUT" -url "' + server.url + '/points?expect=1"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
        });
    });

    it('can send a single JSON object when  maxLength set to 1', () => {
        return check_juttle({
            program: 'read http -url "' + server.url + '/points?count=10"' +
                '| put value=count(), name="field-${value}"' +
                '| write http -method "PUT" -url "' + server.url + '/accept-object"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
        });
    });

    it('can write a stream of data points with -maxLength 10', () => {
        return check_juttle({
            // emit pushes a 1 point a time through the juttle pipeline so
            // doesn't work well here for testing maxLength
            program: 'read http -url "' + server.url + '/points?count=100"' +
                '| put value=count(), name="field-${value}"' +
                '| write http -maxLength 10 -method "PUT" -url "' + server.url + '/points?expect=10"'
        })
        .then((result) => {
            expect(result.errors).deep.equals([]);
            expect(result.warnings).deep.equals([]);
        });
    });
});

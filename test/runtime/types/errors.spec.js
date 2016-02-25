'use strict';

var errors = require('../../../lib/errors');
var expect = require('chai').expect;

describe('Juttle Error tests', function() {
    var e = errors.compileError('INTERNAL-ERROR', { error: 'some error', test: 'info' });

    it('implements proper class inheritance', function() {
        expect(e).is.an.instanceOf(Error);
        expect(e).is.an.instanceOf(errors.CompileError);
        expect(e).is.not.an.instanceOf(errors.RuntimeError);
    });

    it('has the expected message', function() {
        expect(e.message).equals('internal error some error');
    });

    it('stringifies properly', function() {
        expect(e.toString()).equals('CompileError: internal error some error');
    });

    it('serializes to JSON properly', function() {
        expect(JSON.stringify(e)).equals('{"message":"internal error some error","code":"INTERNAL-ERROR","info":{"error":"some error","test":"info"}}');
    });
});

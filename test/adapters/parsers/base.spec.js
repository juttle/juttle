'use strict';

var expect = require('chai').expect;
var parsers = require('../../../lib/adapters/parsers');

describe('parsers/base', function() {

    it('fails when instantiating an invalid parser', function() {
        expect(function() {
            parsers.getParser('bogus');
        }).to.throw('Invalid format option value, must be one of the following:');
    });

    it('fails when using -pattern with invalid -format', function() {
        expect(function() {
            parsers.getParser('csv', {
                pattern: 'bananas'
            });
        }).to.throw('option pattern can only be used with format="grok"');
    });

});

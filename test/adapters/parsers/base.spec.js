'use strict';

var _ = require('underscore');
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

    _.each([
        'separator',
        'commentSymbol',
        'ignoreEmptyLines',
        'allowIncompleteLines'
    ], (option) => {
        it(`fails when using -${option} with invalid -format`, () => {
            expect(() => {
                var options = {};
                options[option] = 'foo';
                parsers.getParser('json', options);
            }).to.throw(`option ${option} can only be used with format="csv"`);
        });
    });
});

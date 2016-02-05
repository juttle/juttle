'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var serializers = require('../../../lib/adapters/serializers');

describe('serializers/base', function() {

    it('fails when instantiating an invalid serializer', function() {
        expect(function() {
            serializers.getSerializer('bogus');
        }).to.throw('Invalid format option value, must be one of the following:');
    });

    _.each(['json'], function(format) {
        it('fails when instantiating a ' + format + ' serializer with append=true', function() {
            expect(function() {
                serializers.getSerializer(format, undefined, { append: true });
            }).to.throw(/option append can only be used with format "csv" or "jsonl"/);
        });
    });

});

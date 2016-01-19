var expect = require('chai').expect;
var serializers = require('../../../lib/adapters/serializers');

describe('serializers/base', function() {

    it('fails when instantiating an invalid serializer', function() {
        expect(function() {
            serializers.getSerializer('bogus');
        }).to.throw('Error: Invalid format option value, must be one of the following:');
    });

});

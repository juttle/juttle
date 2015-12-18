var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var version = require('../../package.json').version;

describe('Juttle Module Tests', function() {
    it('exports the current version of the runtime', function() {
        return check_juttle({
            program: 'emit | put version = Juttle.version | view result'
        })
        .then(function(result) {
            expect(result.sinks.result[0].version).to.equal(version);
        });
    });
});

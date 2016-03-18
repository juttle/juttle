'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var expect = require('chai').expect;
var FileResolver = require('../../lib/module-resolvers/file-resolver');

describe('Native modules ', function() {
    var file_resolver = new FileResolver();
    it('can import a proc from a javascript file', function() {
        return check_juttle({
            moduleResolver: file_resolver.resolve,
            program: `import "${__dirname}/juttles/custom.js" as custom; emit -limit 1 -from :2016-01-01: | custom.tracker`,
        })
        .then(function(res) {
            expect(res.sinks.table).deep.equals([{time: '2016-01-01T00:00:00.000Z'}]);
            expect(res.warnings).deep.equals(['internal error tracker saw 1 points']);
            expect(res.errors).deep.equals([]);
        });
    });
});

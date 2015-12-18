var compile_juttle = require('./specs/juttle-test-utils').compile_juttle;
var expect = require('chai').expect;

describe('Juttle source validation', function() {
    var did_not_invalidate_err = new Error('Did not detect invalid graph!');

    it('counts a single source', function() {
        return compile_juttle({program: 'emit | view result'})
            .then(function(program) {
                var sources = program.get_sources();
                expect(sources.length).to.equal(1);
            });
    });

    it('counts multiple, parallel sources', function() {
        return compile_juttle({program: '( emit | view result; emit | view result )'})
            .then(function(program) {
                var sources = program.get_sources();
                expect(sources.length).to.equal(2);
            });
    });

    it('detects invalid sources in series', function() {
        return compile_juttle({program: 'emit | emit | view result'})
            .then(function() {
                throw did_not_invalidate_err;
            })
            .catch(function(e) {
                expect(e.message).to.match(/emit may not come before a source/);
            });
    });

    it('detects source that is not a head', function() {
        return compile_juttle({program: '( emit | view result1; put a=1 | emit | view result1 )'})
            .then(function() {
                throw did_not_invalidate_err;
            })
            .catch(function(e) {
                expect(e.message).to.match(/put may not come before a source/);
            });
    });

    it('detects flowgraph that doesn\'t begin with a source', function() {
        return compile_juttle({program: 'put a=1 | emit | view result'})
            .then(function() {
                throw did_not_invalidate_err;
            })
            .catch(function(e) {
                expect(e.message).to.match(/put may not come before a source/);
            });
    });
});

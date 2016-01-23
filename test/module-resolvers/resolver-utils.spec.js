'use strict';

var expect = require('chai').expect;
var FileResolver = require('../../lib/module-resolvers/file-resolver');
var path = require('path');
var resolverUtils = require('../../lib/module-resolvers/resolver-utils');
var URLResolver = require('../../lib/module-resolvers/url-resolver');

describe('resolver-utils', function() {
    var modulePath;
    var fileResolver;
    var urlResolver;

    before(function() {
        modulePath = process.env.JUTTLE_MODULE_PATH;
        process.env.JUTTLE_MODULE_PATH = path.join(__dirname, 'input', 'modules1');
        var file_resolver_obj = new FileResolver();
        var url_resolver_obj = new URLResolver();
        fileResolver = file_resolver_obj.resolve;
        urlResolver = url_resolver_obj.resolve;
    });

    after(function() {
        process.env.JUTTLE_MODULE_PATH = modulePath;
    });

    it('fails when no resolver is given', function() {
        var resolver = resolverUtils.multiple([]);
        return resolver('bogus')
        .then(function() {
            throw Error('Previous statement should have failed.');
        })
        .catch(function(err) {
            expect(err.toString()).to.equal('At least 1 resolver must be provided');
        });
    });

    it('fails to find inexistent module with resolver', function() {
        var resolver = resolverUtils.multiple([fileResolver, urlResolver]);
        return resolver('inexistent')
        .then(function() {
            throw Error('Previous statement should have failed.');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('Could not find module: inexistent');
        });
    });

    it('can resolve module with a single resolver', function() {
        var resolver = resolverUtils.multiple([fileResolver]);
        return resolver('foo')
        .then(function(result) {
            expect(result.name).to.equal('foo');
            expect(result.source).to.equal('emit -limit 1;\n');
        });
    });

    it('can resolve module with multiple resolvers', function() {
        var resolver = resolverUtils.multiple([
            fileResolver,
            urlResolver
        ]);

        return resolver('module1')
        .then(function(result) {
            expect(result.name).to.equal('module1');
            expect(result.source).to.equal('// first module1\n');
        });
    });

});

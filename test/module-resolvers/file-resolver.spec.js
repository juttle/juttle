'use strict';

var expect = require('chai').expect;
var path = require('path');

// This loads some test adapters that the tests rely upon. The adapter
// 'test' does have a module directory, while 'testAdapter' does not.
var juttle_test_utils = require('../runtime/specs/juttle-test-utils'); //eslint-disable-line

var FileResolver = require('../../lib/module-resolvers/file-resolver');

function resolveWith(module, path, module_name, importer_path) {

    var modulePath = process.env.JUTTLE_MODULE_PATH;
    process.env.JUTTLE_MODULE_PATH = path;

    var file_resolver = new FileResolver();
    return file_resolver.resolve(module, module_name, importer_path)
    .finally(function() {
        process.env.JUTTLE_MODULE_PATH = modulePath;
    });
}

describe('file-resolver', function() {

    it('fails when attempting to resolve inexistent module', function() {
        return resolveWith('bogus', '')
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('could not find module: bogus');
        });
    });

    it('fails to resolve directory name as a module', function() {
        return resolveWith('directory', '')
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('could not find module: directory');
        });
    });

    it('can resolve an empty module when JUTTLE_MODULE_PATH has a single path', function() {
        return resolveWith('empty', path.join(__dirname, 'input', 'modules1'))
        .then(function(result) {
            expect(result.name).to.equal('empty');
        });
    });

    it('can resolve a module when JUTTLE_MODULE_PATH has a single path', function() {
        return resolveWith('foo', path.join(__dirname, 'input', 'modules1'))
        .then(function(result) {
            expect(result.name).to.equal('foo');
        });
    });

    it('can resolve a module when JUTTLE_MODULE_PATH has multiple paths', function() {
        var modulePath = [
            path.join(__dirname, 'input', 'modules1'),
            path.join(__dirname, 'input', 'modules2')
        ].join(':');

        return resolveWith('foo', modulePath)
        .then(function(result) {
            expect(result.name).to.equal('foo');
        });
    });

    it('resolves modules in order of appearance in JUTTLE_MODULE_PATH', function() {
        var modulePath = [
            path.join(__dirname, 'input', 'modules1'),
            path.join(__dirname, 'input', 'modules2')
        ].join(':');

        return resolveWith('module1', modulePath)
        .then(function(result) {
            expect(result.source).to.equal('// first module1\n');
        });
    });

    it('can resolve by filename', function() {
        return resolveWith(`${__dirname}/input/modules1/foo`, [])
        .then(function(result) {
            expect(result.name).to.equal(`${__dirname}/input/modules1/foo.juttle`);
        });
    });

    it('can resolve by relative filename', function() {
        return resolveWith(`./input/modules1/foo`, [], 'main', `${__dirname}/test.juttle`)
        .then(function(result) {
            expect(result.name).to.equal(`${__dirname}/input/modules1/foo.juttle`);
        });
    });

    it('can resolve by adapter-prefixed path', function() {
        return resolveWith(`adapters/test/index.juttle`, [], 'main')
        .then(function(result) {
            expect(result.name).to.equal('adapters/test/index.juttle');
        });
    });

    it('can resolve by adapter-prefixed path with implied index.juttle', function() {
        return resolveWith(`adapters/test`, [], 'main')
        .then(function(result) {
            expect(result.name).to.equal('adapters/test');
        });
    });

    it('fails to resolve for adapter that does not not exist', function() {
        return resolveWith(`adapters/noSuchAdapter/index.juttle`, [], 'main')
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('could not find module: adapters/noSuchAdapter/index.juttle');
        });
    });

    it('fails to resolve for adapter that does not have any modules', function() {
        return resolveWith(`adapters/testTimeseries/index.juttle`, [], 'main')
        .then(function() {
            throw Error('Previous statement should have failed');
        })
        .catch(function(err) {
            expect(err.toString()).to.contain('could not find module: adapters/testTimeseries/index.juttle');
        });
    });

});

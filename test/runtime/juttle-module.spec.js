'use strict';

var path = require('path');
var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var version = require('../../package.json').version;
var adapters = require('../../lib/runtime/adapters');

// Register a bogus adapter to make sure the list still works.
adapters.configure({invalid: {}});

describe('Juttle Module Tests', function() {
    it('exports the current version of the runtime', function() {
        return check_juttle({
            program: 'emit | put version = Juttle.version | view result'
        })
        .then(function(result) {
            expect(result.sinks.result[0].version).to.equal(version);
        });
    });

    it('exports the current version of all configured adapters', function() {
        return check_juttle({
            program: 'emit -points Juttle.adapters() | view result'
        })
        .then(function(result) {
            var adapterList = adapters.list();
            expect(adapterList).to.contain({
                adapter: 'file',
                builtin: true,
                module: '(builtin)',
                version: version,
                path: path.resolve(__dirname, '../../lib/adapters/file/index.js')
            });

            expect(adapterList).to.contain({
                adapter: 'invalid',
                builtin: false,
                version: '(unknown)',
                module: '(unknown)',
                path: '(unable to load adapter)'
            });

            expect(adapterList).to.contain({
                adapter: 'test',
                builtin: false,
                module: 'test-adapter',
                version: '0.1.0',
                path: path.resolve(__dirname, './test-adapter')
            });

            expect(result.sinks.result).to.deep.equal(adapterList);
        });
    });
});

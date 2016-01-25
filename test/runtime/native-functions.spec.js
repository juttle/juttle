'use strict';

var _ = require('underscore');

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var expect = require('chai').expect;

describe('Juttle Native Functions Tests', function() {

    it('String() "raw string"', function() {
        return check_juttle({
            program: 'emit -from Date.new(0) -limit 1 | put test_field=String.substr("test", 0, 2) | view results',
            return_data: true
        })
        .then(function(output) {
            _(output.sinks.results).each(function(result) {
                expect(result).to.have.property('test_field', 'te');
            });
        });
    });

    it('String() function returning a string', function() {
        return check_juttle({
            program: 'function test_function() { return "test"; }'
                        +'emit -from Date.new(0) -limit 1| put test_field=String.substr(test_function(), 0, 2) | view results',
            return_data: true
        })
        .then(function(output) {
            _(output.sinks.results).each(function(result) {
                expect(result).to.have.property('test_field', 'te');
            });
        });
    });

    it('String.length()', function() {
        return check_juttle({
            program: 'emit -from Date.new(0) -limit 1 | put len=String.length("foo" + "" + "bar") | view results',
            return_data: true
        })
        .then(function(output) {
            expect(output.sinks.results[0]).to.have.property('len', 6);
        });
    });

    it('String() field in point', function() {
        return check_juttle({
            program: 'read file -file "input/simple-events.json" | put test_field=String.substr(#event_type, 0, 6) | view results',
            return_data: true
        })
        .then(function(output) {
            _(output.sinks.results).each(function(result) {
                expect(result).to.have.property('test_field', 'juttle');
            });
        });
    });

    it('String() null', function() {
        return check_juttle({
            program: 'read file -file "input/simple-events.json" | put test_field=String.substr(null, 0, 6) | view results',
            return_data: true
        })
        .then(function(output) {
            expect(output.warnings[0]).equal('Invalid argument type for "String.substr": expected string, received null.');
        });
    });

});

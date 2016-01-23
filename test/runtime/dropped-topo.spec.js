'use strict';

var expect = require('chai').expect;
var compiler = require('../../lib/compiler');
var check_dropped = require('../../lib/compiler/flowgraph/check_dropped');

describe('Dropped source topology checks', function() {
    function test(juttle, is_ok) {
        try {
            compiler.compileSync(juttle, {fg_processors: [check_dropped]});
        } catch (e) {
            if (!is_ok) {
                expect(e.code).to.equal('JUTTLE-DROPPED-TOPO');
                return true;
            }
            throw(e);
        }
    }

    describe('Valid flowgraphs', function() {
        it('emit -limit 100 | view table; dropped | view table', function() {
            test('emit -limit 100 | view table; dropped | view table', true);
        });
        it('emit -limit 100 | view table; dropped | keep a | put b = 1 | view table', function() {
            test('emit -limit 100 | view table; dropped | keep a | put b = 1 | view table', true);
        });
    });

    describe('Invalid flowgraphs', function() {

        it('dropped | (put a = 1; put a = 2) | view table', function() {
            test('dropped | (put a = 1; put a = 2) | view table', false);
        });

        it('(emit -limit 100; dropped) | view table', function() {
            test('(emit -limit 100; dropped) | view table', false);
        });
    });
});

'use strict';

var expect = require('chai').expect;
var compiler = require('../../lib/compiler');
var check_runaway = require('../../lib/compiler/flowgraph/check_runaway');

require('./specs/juttle-test-utils'); // register test adapter

describe('Runaway program detection', function() {
    function test(juttle, is_runaway) {
        it(juttle, function() {
            try {
                compiler.compileSync(juttle, {fg_processors: [check_runaway]});
            } catch (e) {
                if (is_runaway) {
                    expect(e.code).to.equal('RUNAWAY-PROGRAM');
                } else {
                    throw e;
                }
            }
        });
    }

    test('read test -key "a" | reduce count()| view text', true);
    test('read test -key "a" | reduce -every :s: count()| view text', false);
    test('read test -key "a" | reduce -every :s: count()| view text', false);
    test('read test -key "a" | batch :s: | reduce count()| view text', false);
    test('read test -key "a" -from :-1h: -to :now: | reduce count()| view text', false);
    test('read test -key "a" -from :-1h: -to :now: | reduce count() | view table; read test -key "a" | reduce count()| view text', true);
    test('read test -key "a" | put a = count() | reduce count() | put a = count() | view text', true);
    test('read test -key "a" | reduce -every :s: count() | reduce max(m) | view text', true);

    test('read test -key "a" | sort field | view text', true);
    test('read test -key "a" | batch 1 | sort field | view text', false);

    test('read test -key "a" | tail 1| view text', true);
    test('read test -key "a" | batch 1 | tail 1| view text', false);
    test('read test -key "a" | head 1| view text', false);
});

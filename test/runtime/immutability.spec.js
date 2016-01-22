'use strict';

var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;


describe('Juttle const tests', function() {

    function test_immutable(what, program, re) {
        it('rejects a ' + what, function() {
            return check_juttle({ program: program })
                .then(function() {
                    throw new Error('should have failed');
                })
                .catch(function(err) {
                    expect(err.message).match(re);
                });
        } );
    }

    describe ('Immutability in function context', function () {
        test_immutable('un-initialized const',
                       'function f() {const a;}',
                       /Const "a" must be initialized/);

        test_immutable('statement assignment to a const',
                       'function f() {const a=1; a=2;}',
                       /Variable "a" cannot be assigned to/);

        test_immutable('expression assignment to a const',
                       'function f() {const a=1; const b = (a=2);}',
                       /Variable "a" cannot be assigned to/);

        test_immutable('postfix operator on a const',
                       'function f() { const a=0; var x=a++;}',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const',
                       'function f() { const a=0; var x=++a;}',
                       /Invalid use of prefix operator \+\+ with variable "a"/);

        test_immutable('assignment to a const array element',
                       'function f() { const a=[0]; a[0]=1;}',
                       /Variable "a" cannot be modified/);

        test_immutable('postfix operator on a const array',
                       'function f() { const a=[0]; var x=a[0]++;}',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const array',
                       'function f() { const a=[0]; var x=++a[0];}',
                       /Invalid use of prefix operator \+\+ with variable "a"/);
    });

    describe ('Immutability in flowgraph context (top-level)', function () {
        test_immutable('un-initialized const',
                       'const a;',
                       /Const "a" must be initialized/);

        test_immutable('postfix operator on a const',
                       ' const a=0; const b=a++;',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const',
                       ' const a=0; const b=++a;',
                       /Invalid use of prefix operator \+\+ with variable "a"/);

        test_immutable('postfix operator on a const array',
                       ' const a=[0]; const b=a[0]++;',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const array',
                       ' const a=[0]; const b=++a[0];',
                       /Invalid use of prefix operator \+\+ with variable "a"/);

        test_immutable('top-level const assigned inside a function',
                       ' const a=1; function f() { a=2;}',
                       /Variable "a" cannot be assigned to/);

    });

    describe ('Immutability in flowgraph context (sub)', function () {
        test_immutable('un-initialized const',
                       'sub s() {const a;}',
                       /Const "a" must be initialized/);

        test_immutable('postfix operator on a const',
                       'sub f() { const a=0; const b=a++;}',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const',
                       'sub f() { const a=0; const b=++a;}',
                       /Invalid use of prefix operator \+\+ with variable "a"/);

        test_immutable('postfix operator on a const array',
                       'sub f() { const a=[0]; const b=a[0]++;}',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const array',
                       'sub f() { const a=[0]; const b=++a[0];}',
                       /Invalid use of prefix operator \+\+ with variable "a"/);

        test_immutable('postfix operator on a sub argument',
                       'sub f(a) { const b=a++;}',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a sub argument',
                       'sub f(a) { const b=++a;}',
                       /Invalid use of prefix operator \+\+ with variable "a"/);

        test_immutable('postfix operator on a sub argument (array)',
                       'sub f(a) { const b=a[0]++;}',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a sub argument (array)',
                       'sub f(a) { const b=++a[0];}',
                       /Invalid use of prefix operator \+\+ with variable "a"/);

        test_immutable('top-level constant argument assigned inside a sub function',

                       'const a = 1; sub s() { function f() { a=2;} pass} emit -limit 1 | s | view logger',
                       /Variable "a" cannot be assigned to/);

        test_immutable('top-level constant argument assigned inside a sub',
                       'const a = 1; sub s() { a=2; pass} emit -limit 1 | s | view logger',
                       /Expected/);

    });


    describe ('Immutability in "put" proc expressions', function () {

        test_immutable('postfix operator on a const',
                       'const a = 1; emit | put s = a++ | view s',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const',
                       'const a = 1; emit | put s = a++ | view s',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

    });

    describe ('Immutability in "reduce" proc expressions', function () {

        test_immutable('postfix operator on a const',
                       'const a = 1; emit | reduce s = a++ | view s',
                       /Invalid use of postfix operator \+\+ with variable "a"/);

        test_immutable('prefix  operator on a const',
                       'const a = 1; emit | reduce s = a++ | view s',
                       /Invalid use of postfix operator \+\+ with variable "a"/);
    });
});

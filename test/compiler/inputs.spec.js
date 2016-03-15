'use strict';

var chai = require('chai');
var chaiAsPromised = require('chai-as-promised');
var juttle_test_utils = require('../runtime/specs/juttle-test-utils');
var compile_juttle = juttle_test_utils.compile_juttle;
var check_juttle = juttle_test_utils.check_juttle;
var input_default_fns = require('../spec/input-default-functions');
var Filter = require('../../lib/runtime/types/filter');

chai.use(chaiAsPromised);
var expect = chai.expect;

describe('Juttle inputs', function() {

    it('no gadgets', function() {
        return compile_juttle({program: 'emit -limit 1', inputs: []});
    });

    it('gadgets in a const declaration', function() {
        return check_juttle({program: 'input a: number; input b: text; ' +
                                'emit -from :0: -limit a | put message=b | view sink',
                    inputs: {
                        a: 1,
                        b: 'hello'
                    }
                  })
            .then(function(res) {
                expect(res.sinks.sink.length).equal(1);
                expect(res.sinks.sink[0].message).equal('hello');
            });
    });

    it('gadgets in a sub', function() {
        return check_juttle({program: 'sub s() {' +
                                '  input a: text; ' +
                                '  emit -from :0: -limit 1 | put message = a' +
                                '}' +
                                's | view s1; ' +
                                'input a: number; ' +
                                'emit -from :0: -limit 1 | put value=a | view s2;' +
                                's | view s3',
                    inputs: {
                        's.a[0]': 'first',
                        'a': 0,
                        's.a[1]': 'second'
                    }})
            .then(function(res) {
                expect(res.sinks.s1.length).equal(1);
                expect(res.sinks.s2.length).equal(1);
                expect(res.sinks.s3.length).equal(1);
                expect(res.sinks.s1[0].message).equal('first');
                expect(res.sinks.s2[0].value).equal(0);
                expect(res.sinks.s3[0].message).equal('second');
            });
    });

    it('gadgets in a module sub', function() {
        return check_juttle({program: 'import "mod" as mod;' +
                                'mod.s | view s1; ' +
                                'input a: number; emit -from :0: -limit 1 | put value=a | view s2;' +
                                'mod.s | view s3',
                       modules: {mod: 'export sub s() {' +
                                 '  input a: text; ' +
                                 '  emit -from :0: -limit 1 | put message = a' +
                                 '}'
                                },
                       inputs: {
                           'mod/s.a[0]': 'first',
                           'a': 0,
                           'mod/s.a[1]': 'second'
                       }})
            .then(function(res) {
                expect(res.sinks.s1.length).equal(1);
                expect(res.sinks.s2.length).equal(1);
                expect(res.sinks.s3.length).equal(1);
                expect(res.sinks.s1[0].message).equal('first');
                expect(res.sinks.s2[0].value).equal(0);
                expect(res.sinks.s3[0].message).equal('second');
            });
    });


    // Regression test for PROD-7780.
    it('gadgets with an array without [...] as an option', function() {
        return check_juttle({program: 'input d: select -items "a", "b", "c";' +
                                'emit -from :0: -limit 1 | view sink',
                             inputs: {
                                 d: 'a'
                             }});
    });

    describe('inputs depending on inputs', function() {
        it('label gets populated with view of input', () => {
            return check_juttle({
                program: 'input a: text; input b: text -label a;' +
                         'emit | view sink'
            })
            .then((res) => {
                // console.log(res);
            });
        });
    });

    describe.skip('gadgets producing a filter', function() {
        it('returns correct result with a valid filter', function() {
            return check_juttle({program: 'input f: filter; ' +
                                 'emit -from :0: -limit 3 | put c = count() | filter f | view sink',
                                 inputs: {
                                     f: new Filter(
                                         {
                                             type: 'ExpressionFilterTerm',
                                             expression: {
                                                 type: 'BinaryExpression',
                                                 operator: '<',
                                                 left: { type: 'Variable', name: 'c' },
                                                 right: { type: 'NumberLiteral', value: 2 }
                                             }
                                         },
                                         'c < 2'
                                     )
                                 }})
                .then(function(res) {
                    expect(res.sinks.sink.length).equal(1);
                    expect(res.sinks.sink[0].c).equal(1);
                });
        });

        it('produces an error with an invalid filter', function() {
            return check_juttle({program: 'input f: filter; ' +
                                 'emit -from :0: -limit 3 | put c = count() | filter f | view sink',
                                 inputs: {
                                     f: new Filter(
                                         {
                                             type: 'SimpleFilterTerm',
                                             expression: {
                                                 type: 'StringLiteral',
                                                 value: 'abcd'
                                             }
                                         },
                                         '"abcd"'
                                     )
                                 }})
                .then(function() {
                    throw new Error('this should fail');
                })
                .catch(function(err) {
                    expect(err.message).to.eq('Free text search is not implemented in this context.');
                });
        });
    });

    describe('input value', function() {
        it('is filled-in using the supplied value', function() {
            return check_juttle({program: 'input a: text -default "default";' +
                                    'emit -from :0: -limit 1 | put message = a | view sink',
                                 inputs: {
                                     a: 'value'
                                 },
                                 input_defaults: input_default_fns})
                .then(function(res) {
                    expect(res.sinks.sink.length).equal(1);
                    expect(res.sinks.sink[0].message).equal('value');
                });
        });

        it('is filled-in using -default when no value is supplied', function() {
            return check_juttle({program: 'input a: text -default "default";' +
                                    'emit -from :0: -limit 1 | put message = a | view sink',
                        inputs: {},
                        input_defaults: input_default_fns})
                .then(function(res) {
                    expect(res.sinks.sink.length).equal(1);
                    expect(res.sinks.sink[0].message).equal('default');
                });
        });

        it('is filled-in using the with input default when there is no -default and no value is supplied', function() {
            return check_juttle({program: 'input a: text;' +
                                    'emit -from :0: -limit 1 | put message = a | view sink',
                        inputs: {}})
                .then(function(res) {
                    expect(res.sinks.sink.length).equal(1);
                    expect(res.sinks.sink[0].message).equal('');
                });
        });

        it('handles arrays', function() {
            return check_juttle({program: 'input d: select -items [["a", "b", "c"]];' +
                                    'emit -from :0: -limit 1 | put message = d | view sink',
                        inputs: {d: ['a', 'b', 'c']},
                        input_defaults: input_default_fns})
                .then(function(res) {
                    expect(res.sinks.sink.length).equal(1);
                    expect(res.sinks.sink[0].message).deep.equal(['a', 'b', 'c']);
                });
        });


        it('is "" when there is no -default, and no value is supplied', function() {
            return check_juttle({program: 'input a: text;' +
                                    'emit -from :0: -limit 1 | put message = a | view sink',
                        inputs: {}})
                .then(function(res) {
                    expect(res.sinks.sink.length).equal(1);
                    expect(res.sinks.sink[0].message).equal('');
                });
        });
    });

    describe('error conditions', () => {
        it('unknown input throws error', () => {
            let promise = check_juttle({
                program: 'input a: invalid; emit;'
            });

            expect(promise).to.be.rejectedWith(/Unknown input "invalid"/);
        });

        it('input value of array for text input throws error', () => {
            let promise = check_juttle({
                program: 'input a: text -default "default";' +
                    'emit -from :0: -limit 1 | put message = a | view sink',
                inputs: { a: ['a', 'b', 'c'] },
            });

            expect(promise).to.be.rejectedWith(/Invalid value "a,b,c" from input "a"/);
        });

        it('input value of string for number input throws error', () => {
            let promise = check_juttle({
                program: 'input a: number -default 0;' +
                    'emit -from :0: -limit 1 | put message = a | view sink',
                inputs: { a: 'error' }
            });

            expect(promise).to.be.rejectedWith(/Invalid value "error" from input "a"/);
        });

    });
});

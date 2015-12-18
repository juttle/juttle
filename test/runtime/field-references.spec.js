var _ = require('underscore');
var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;


describe('Juttle Field Reference Tests', function() {

    it('basic put', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | put foo=#rate | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate);
                });
            });
    });

    it('basic put (long notation)', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | put foo=*"rate" | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate);
                });
            });
    });

    it('basic put (pedantic)', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | put #foo=#rate | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate);
                });
            });
    });

    it('passed to function', function() {
        return check_juttle({
            program: 'function multiply(fieldValue) { return fieldValue * 5; }'
                + 'read file -file "input/simple.json" | put foo=multiply(#rate) | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate * 5);
                });
            });
    });

    it('passed to function (long notation)', function() {
        return check_juttle({
            program: 'function multiply(fieldValue) { return fieldValue * 5; }'
                + 'read file -file "input/simple.json" | put foo=multiply(*"rate") | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate * 5);
                });
            });
    });

    it('still works when variable has same name', function() {
        return check_juttle({
            program: 'const rate = 983175;'
                + 'read file -file "input/simple.json" | put foo=#rate | put bar=rate | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate);
                    expect(point.bar).to.equal(983175);
                });
            });
    });

    it('can double de-reference', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | put foo="rate" | put bar=**"foo" | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.bar).to.equal(point.rate);
                });
            });
    });

    it('can double de-reference with shortcut notation', function() {
        return check_juttle({
            program: 'const rate = 983175;'
                + 'read file -file "input/simple.json" | put foo="rate" | put bar=*#foo | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.bar).to.equal(point.rate);
                });
            });
    });

    it('can de-reference a function call', function() {
        return check_juttle({
            program: 'function getFieldName() { return "rate"; }'
                + 'read file -file "input/simple.json" | put foo=*getFieldName() | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate);
                });
            });
    });

    it('can de-reference a function call on LHS', function() {
        return check_juttle({
            program: 'function getFieldName() { return "foo"; }'
                + 'read file -file "input/simple.json" | put *getFieldName()=#rate | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate);
                });
            });
    });

    it('can de-reference in a sub ', function() {
        return check_juttle({
            program: 'sub copy(src, dest) {'
                +'put *dest=*src'
                +'}'
                + 'read file -file "input/simple.json" | copy -src "rate" -dest "foo" | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(point.rate);
                });
            });
    });

    it("doesn't coerce LHS for regular assignment expressions", function() {
        return check_juttle({
            program: 'function f() { var a, b; a = (b = 1); return a; }'
                + 'read file -file "input/simple.json" | put foo=f() | view sink1'
        })
            .then(function (results) {
                _(results.sinks.sink1).each(function(point) {
                    expect(point.foo).to.equal(1);
                });
            });
    });

    it("field reference in a return statement", function() {
        return check_juttle({
            program: [ 'reducer foo(field) {',
                       '  var res=0;',
                       '  function result() { return res; }',
                       '  function update() { function f() { return *field; } res = f(); }',
                       '}',
                       'emit -limit 1 | batch 1 | put a = 1 | put b = foo("a") | view result'
                     ].join(' ')
        })
            .then(function (results) {
                expect(results.sinks.result[0].b = 1);
            });
    });

    describe('field reference scoping', function() {
        function test_bad_reference(what, program) {
            it('rejects a ' + what, function() {
                return check_juttle({ program: program })
                    .then(function() {
                        throw new Error('should have failed');
                    })
                    .catch(function(err) {
                        expect(err.message).match(/invalid field reference/);
                    });
            } );
        }

        test_bad_reference('# field reference at top level',
                           'const x=#time; emit -limit 1 | view result');

        test_bad_reference('* field reference at top level',
                           'const x="time", y=*x; emit -limit 1 | view result');

        test_bad_reference('# field reference inside a function',
                           'function foo(x) { x=#field; }');

        test_bad_reference('* field reference inside a function',
                           'function foo(x, y) { x=*y; }');

        test_bad_reference('# field reference inside a reducer body',
                           [ 'reducer foo() {',
                             '  var y=#field;',
                             '  function result() { return 0; }',
                             '  function update() { y=y+1; }',
                             '}',
                             'emit -limit 1 | view result'
                           ].join(' '));

        test_bad_reference('* field reference inside a reducer body',
                           [ 'reducer foo(fname) {',
                             '  var y=*fname;',
                             '  function result() { return 0; }',
                             '  function update() { y=y+1; }',
                             '}',
                             'emit -limit 1 | view result'
                           ].join(' '));

        test_bad_reference('# field reference inside reducer result()',
                           [ 'reducer foo(fname) {',
                             '  var y=0;',
                             '  function result() { var x = #fname; return x; }',
                             '  function update() { y=y+1; }',
                             '}',
                             'emit -limit 1 | view result'
                           ].join(' '));

        test_bad_reference('* field reference inside reducer result()',
                           [ 'reducer foo(fname) {',
                             '  var y=0;',
                             '  function result() { var x = *fname; return x; }',
                             '  function update() { y=y+1; }',
                             '}',
                             'emit -limit 1 | view result'
                           ].join(' '));

        test_bad_reference('# field reference in proc parameters',
                           'emit -limit 1 | head #field | view result');

        test_bad_reference('* field reference in proc parameters',
                           'const f="foo"; emit -limit 1 | head *f | view result');
    });

});

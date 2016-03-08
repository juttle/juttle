'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var expect = require('chai').expect;


describe('Juttle basic language tests', function() {
    it('fails cleanly with an empty Juttle program', function() {
        return check_juttle({
            program: ''
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.message).to.equal('Cannot run a program without a flowgraph.');
        });
    });

    it('fails cleanly with an empty sub', function() {
        return check_juttle({
            program: 'sub empty() {}; empty'
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.message).to.equal('A sub must contain a flowgraph.');
        });
    });

    it('succeeds with a source and single sink', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | view sink1',
            expect_file: 'expected/single-sink-direct.json',
        });
    });

    it('succeeds with a source and single sink and a different data set', function() {
        return check_juttle({
            program: 'read file -file "input/simple-non-monotonic-time.json" | view sink1',
            expect_file: 'expected/single-sink-direct-non-monotonic.json',
        });
    });

    it('succeeds with a source and two sinks', function() {
        return check_juttle({
            program: 'read file -file "input/simple-non-monotonic-time.json" | (view sink1; view sink2)',
            expect_file: 'expected/two-sinks-mirrored.json',
        });
    });

    it('succeeds with a read file -file, a put command, and a single sink', function() {
        return check_juttle({
            program: 'read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+1.2 | view sink1',
            expect_file: 'expected/put-expression.json',
        });
    });

    it('succeeds with a const, read file -file, a put command, and a single sink', function() {
        return check_juttle({
            program: 'const foo=1.2; read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+foo | view sink1',
            expect_file: 'expected/put-expression.json',
        });
    });

    it('fails if a semicolon is missing after const declaration', function() {
        return check_juttle({
            program: 'const foo=1.2 read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+foo | view sink1',
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
        });
    });

    it('fails if the read file -file of a program is not a valid read file -file', function() {
        return check_juttle({
            program: 'banana | put value=count() | view sink1',
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
        });
    });

    it('fails if any of the read file -files in a program is not a valid read file -file', function() {
        return check_juttle({
            program: '( emit -limit 1 | put value=count() | view sink1; ' +
                'banana | put value=count() | view sink2' +
                'emit -limit 2 | put value=count() | view sink3 )'
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
        });
    });

    it('fails if an undeclared const is initialized (in flowgraph context)', function() {
        return check_juttle({
            program: 'foo=1.2; read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+foo | view sink1',
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
            expect(err.message).to.match(/Expected/);
        });
    });

    it('fails if an undeclared const is initialized (in function context)', function() {
        return check_juttle({
            program: 'function f() { foo=1.2; } read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+foo | view sink1',
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/undefined variable|is not defined/i);
        });
    });

    it('fails if a const is not initialized', function() {
        return check_juttle({
            program: 'const foo; read file -file "input/simple-non-monotonic-time.json" | view sink1',
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/Const .* must be initialized/i);
        });
    });

    it('fails if a const is bound in its own declaration', function() {
        return check_juttle({
            program: 'const foo = foo + 1; emit | view text',
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/foo is not defined/i);
        });
    });

    it('fails if a variable is bound in its own declaration', function() {
        return check_juttle({
            program: 'function f() { var foo = foo + 1; return foo;} emit -hz 1000 -limit 1 | put a = f() | view text',
        })
        .then(function() {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/foo is not defined/i);
        });
    });

    it('succeeds with multiple consts, simple artithmetic, read file -file, a put command, and a single sink', function() {
        return check_juttle({
            program: 'const bar=1.2; const baz=2; const foo=bar*baz; read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+(foo/baz) | view sink1',
            expect_file: 'expected/put-expression.json'
        });
    });

    it('literal empty strings stay empty', function() {
        return check_juttle({
            program: 'emit -from Date.new(0) -limit 1 | put single=\'\', double="" | view result'
        })
        .then(function(res) {
            expect(res.sinks.result).deep.equal([{time:'1970-01-01T00:00:00.000Z', single: '', double:''}]);
        });
    });

    it('succeeds defining and accessing a literal array', function() {
        return check_juttle({
            program: ['const foo=[1,2,3]; const bar=foo[1];',
                      'read file -file "input/simple.json"',
                      '| put FOO=foo, BAR=bar, BAZ=foo[0]*foo[2]',
                      '| view sink1'
                     ].join(''),
            expect_file: 'expected/literal-array.json'
        });
    });

    it('succeeds defining an empty array', function() {
        return check_juttle({
            program: 'const foo=[]; emit -from Date.new(0) -limit 1 | put empty=foo | view result'
        }).then(function(res) {
            expect(res.sinks.result).to.deep.equal([{'time':'1970-01-01T00:00:00.000Z', 'empty':[]}]);
        });
    });


    it('succeeds accessing an array-type return value', function() {
        return check_juttle({
            program: ['function freens() {',
                      '    return ["ignored", "free", "ignored"];',
                      '}',
                      'const foo=freens()[1];',
                      'read file -file "input/simple.json"',
                      '| put FOO=foo, F=foo[0]',
                      '| view sink1'
                     ].join(''),
            expect_file: 'expected/free-array.json'
        });
    });

    it('handles simple conditions', function() {
        return check_juttle({
            program: [
                'function number(x) {',
                'if (x == Date.new(0)) {',
                'return 3;',
                '} else {',
                'return 5;',
                '}',
                '}',
                'emit -from Date.new(0) -limit 3 | put value=number(#time) | view result'
            ].join('\n')
        })
        .then(function(res) {
            expect(res.sinks.result).deep.equal([{time:'1970-01-01T00:00:00.000Z', value: 3},
                                                 {time:'1970-01-01T00:00:01.000Z', value: 5},
                                                 {time:'1970-01-01T00:00:02.000Z', value: 5}]);
        });
    });

    it('handles nested conditions', function() {
        return check_juttle({
            program: [
                'function number(x) {',
                'if (x == Date.new(0)) {',
                'return 3;',
                '} else if (x == Date.new(1)) {',
                'return 5;',
                '} else {',
                'return 7;',
                '}',
                '}',
                'emit -from Date.new(0) -limit 3 | put value=number(#time) | view result'
            ].join('\n')
        })
        .then(function(res) {
            expect(res.sinks.result).deep.equal([{time:'1970-01-01T00:00:00.000Z', value: 3},
                                                 {time:'1970-01-01T00:00:01.000Z', value: 5},
                                                 {time:'1970-01-01T00:00:02.000Z', value: 7}]);
        });
    });

    it('fails accessing an undefined var property', function() {
        return check_juttle({
            program: 'const foo = bar.freen; read file -file "input/simple.json" | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/.* is not defined/);
        });
    });

    it('fails accessing an undefined function property', function() {
        return check_juttle({
            program: 'const foo = bar.freen(1); read file -file "input/simple.json" | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/.* is not defined/);
        });
    });

    it('fails accessing an undefined proc property', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | bar.freen | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/.* not exported by/);
        });
    });

    it('still works with no extra spaces', function() {
        return check_juttle({
            program: 'const bar=1.2;const baz=2;const foo=bar*baz;read file -file "input/simple-non-monotonic-time.json"|put snarks=#grumpkins+(foo/baz)|view sink1',
            expect_file: 'expected/put-expression.json',
        });
    });


    it('fails if an expression has a syntax error (javascript section)', function() {
        return check_juttle({
            program: 'const foo = 5+; read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+foo | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
            expect(err.message).to.match(/expected/i);
            expect(err.info.expected).to.be.an('array');
        });
    });


    it('fails if an expression has a syntax error (pipeline section)', function() {
        return check_juttle({
            program: 'read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+ | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
            expect(err.message).to.match(/expected/i);
            expect(err.info.expected).to.be.an('array');
        });
    });

    it('fails if when arguments are missing from procs', function() {
        return check_juttle({
            program: 'read file -file "input/simple-non-monotonic-time.json" | pass | put | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
            expect(err.message).to.match(/expected/i);
            expect(err.info.expected).to.be.an('array');
        });
    });


    it('fails if a pipe character is missing', function() {
        return check_juttle({
            program: 'read file -file "input/simple-non-monotonic-time.json" | put funs=#funkins+1.2  put snarks=#grumpkins+1.2 | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
            expect(err.message).to.match(/expected/i);
            expect(err.info.expected).to.be.an('array');
        });
    });

    it('fails if a pipe character is missing before the sink', function() {
        return check_juttle({
            program: 'read file -file "input/simple-non-monotonic-time.json" | put snarks=#grumpkins+1.2  view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
            expect(err.message).to.match(/expected/i);
            expect(err.info.expected).to.be.an('array');
        });
    });


    it('passes variables in sub scope correctly', function() {
        return check_juttle({
            program:
                'const foo=1.2;' +
                'sub myproc() {' +
                '  put snarks=#grumpkins + foo' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| myproc | view sink1',
            expect_file: 'expected/put-expression.json',
        });
    });


    it('masks variables in sub scope correctly', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'sub myproc() {' +
                '  const foo=1.2;' +
                '  put snarks=*"grumpkins" + foo' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| myproc | view sink1',
            expect_file: 'expected/put-expression.json',
        });
    });

    it('masks variables in function scope correctly', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'function myfunc() {' +
                '  var foo=1.2;' +
                '  return foo;' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| put snarks=#grumpkins + myfunc() | view sink1',
            expect_file: 'expected/put-expression.json',
        });
    });

    it('masks variables that function arguments', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'function myfunc(foo) {' +
                '  return foo * 2;' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| put snarks=#grumpkins + myfunc(0.6) | view sink1',
            expect_file: 'expected/put-expression.json',
        });
    });

    it('const inside a sub', function() {
        return check_juttle({
            program:
                'sub s() {' +
                '  const c = 3; ' +
                '  put a=c ' +
                '}' +
                'emit -limit 1 -hz 1000 | s | keep a | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{a: 3}]);
        });
    });

    it('function-in-function returning top-level const', function() {
        return check_juttle({
            program:
             ' const y = 1; ' +
                '  function f() { function g() { return y;} return g(); }' +
                'emit -limit 1 | put a = f() | keep a | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{a: 1}]);
        });
    });

    it('function-in-function returning function arg', function() {
        return check_juttle({
            program:
             ' const y = 1; ' +
                '  function f(y) { function g(y) { return y+1;} return g(y+1); }' +
                'emit -limit 1 | put a = f(1.1) | keep a | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{a: 3.1}]);
        });
    });

    it('const inside a function', function() {
        return check_juttle({
            program:
            'function f(x) {' +
                'const v = 2;' +
                'const y = x;' +
                'const z = x + y;' +
                'return z + v;' +
                '}' +
                'emit -limit 1 | put b = 4, a = f(b) | keep a | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{a: 10}]);
        });
    });

    // XXX this does not cause an error
    it.skip('fails if a sub redefines a variable', function() {
        return check_juttle({
            program:
                'const foo=1.2;' +
                'sub foo() {' +
                '  put snarks=#grumpkins + foo' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| foo() | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .then(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/is not defined/i);
        });
    });

    it('fails if a Javascript variable is undefined', function() {
        return check_juttle({
            program:
                'const foo=bar;' +
                'sub myproc() {' +
                '  put snarks=#grumpkins + foo' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| myproc | view sink1',
            expect_file: 'expected/put-expression.json',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/is not defined/i);
            // XXX variable name is not propagated to message:
            // expect(err.message).to.match(/^bar/i);
        });
    });

    it('fails if a variable is redefined in the javascript section', function() {
        return check_juttle({
            program:
                'const foo=1.2;' +
                'const foo=2.4;' +
                'sub myproc() {' +
                '  put snarks=#grumpkins + foo' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| myproc | view sink1',
            expect_file: 'expected/put-expression.json',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('CompileError');
            expect(err.message).to.match(/redefined const:/i);
        });
    });

    // XXX this doesn't fail
    it.skip('fails if a sub is redefined', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'sub myproc() {' +
                '  put snarks=#grumpkins + foo' +
                '}' +
                'sub myproc() {' +
                '  put snarks=#grumpkins + 1.2' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| myproc() | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('Error');
            expect(err.message).to.match(/redefined variable/i);
        });
    });

    // XXX this doesn't fail
    it.skip('fails if a function has the same name as a variable', function() {
        return check_juttle({
            program:
                'const foo=1.2;' +
                'function foo() {' +
                '  return foo;' +
                '}' +
                'read file -file "input/simple-non-monotonic-time.json"| put snarks=#grumpkins + foo() | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('Error');
            expect(err.message).to.match(/redefined variable/i);
        });
    });

    it('fails if a label is omitted', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | put snarks=#grumpkins+1.2 as | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
        });
    });

    it('fails if a non-read file -file is labelled', function() {
        return check_juttle({
            program: 'read file -file "input/simple.json" | put a=1 as p | view sink1',
        })
        .then(function(data) {
            throw new Error('this should fail');
        })
        .catch(function(err) {
            expect(err.name).to.equal('SyntaxError');
        });
    });

    it('fails if a user-defined sub is called with missing arguments', function() {
        return check_juttle({
            program: 'sub f(missing) { const x = missing; emit -from Date.new(0) -limit 1 | put x=missing | view sink1} f ',
        })
        .then(function(data) {
            throw new Error('this should fail');
        }).catch(function(err) {
            expect(err.message).to.match(/Subgraph f called without argument missing/i);
        });
    });

    it('handles a sink inside a non-terminal parallel graph', function() {
        return check_juttle({
            program: 'emit -from Date.new(0) -limit 5 | (view sink1; put foo=3) | view sink2'
        } )
        .then(function(res) {
            expect(res.sinks.sink1.length).to.equal(5);
            expect(res.sinks.sink2.length).to.equal(5);
        } );
    } );

    it('succeeds arithmetic unary expression with expression returning number', function() {
        return check_juttle({
            program: 'function bar() { return 5; } emit -limit 1 -from Date.new(0) | put foo= -bar() | view result'
        })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([{
                    time: '1970-01-01T00:00:00.000Z',
                    foo: -5
                }]);
            });
    });

    it('succeeds non-arithmetic unary expression', function() {
        return check_juttle({
            program: 'function bar(x) { return !x ? 1 : 0; } emit -limit 1 -from Date.new(0) |' +
                ' put foo = bar(false) | put foo2 = bar(true) | view result'
        })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([{
                    time: '1970-01-01T00:00:00.000Z',
                    foo: 1,
                    foo2: 0
                }]);
            });
    });

    it('evaluates non-deterministic function at run time', function() {
        return check_juttle({
            program: '    function f() { return Math.random(); }' +
                ' emit -from Date.new(0) -limit 2 | put a = f() | keep a | view result'
        })
            .then(function(res) {
                expect(res.sinks.result[0].a - res.sinks.result[1].a).not.to.equal(0);
            });
    });

    it('understands | in toplevel expression as a pipe, not bitwise or', function() {
        return check_juttle({
            program: 'emit -from Date.new(0) -limit 1 | put a="a" | pass | view result'
        })
            .then(function(res) {
                expect(res.sinks.result).to.deep.equal([{
                    time: '1970-01-01T00:00:00.000Z',
                    a: 'a'
                }]);
            });
    });
});

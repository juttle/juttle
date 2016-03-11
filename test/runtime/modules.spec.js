'use strict';

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var compile_juttle = juttle_test_utils.compile_juttle;
var _ = require('underscore');
var Promise = require('bluebird');

var expect = require('chai').expect;

var parser = require('../../lib/parser');

var FileResolver = require('../../lib/module-resolvers/file-resolver');

describe('Juttle modules ', function() {

    var moduleLibrary = {
        'mod1': 'import "mod3" as mod3; import "mod4" as mod4; ',
        'mod2': 'import "mod5" as mod5; import "mod6" as mod6; ',
        'mod3': 'const a=1;',
        'mod4': 'const a=1;',
        'mod5': 'const a=1;',
        'mod6': 'const a=1;',
        'cycle1': 'import "cycle2" as cycle2; import "mod5" as mod5;',
        'cycle2': 'import "mod6" as mod6; import "cycle1" as cycle1;',
    };

    var moduleResolver = function (modules) {
        return function(moduleName) {
            return new Promise(function(resolve, reject) {
                if (_.has(modules, moduleName)) {
                    resolve({source: modules[moduleName], name: moduleName});
                } else {
                    reject(new Error('could not find module ' + moduleName));
                }
            }).delay(Math.random() * 200);
        };
    };

    describe('Modules: parsing and compilation', function() {

        it('Accepts valid import statements', function() {
            return compile_juttle({program: 'import "mod1" as mod1; import "mod2" as mod2;  emit | view sink',
                                   moduleResolver: moduleResolver(moduleLibrary)});
        });

        it('Parser recursive import statements', function() {
            return parser.parse('import "cycle1" as cycle1;  emit | view sink',
                                {moduleResolver: moduleResolver(moduleLibrary)});
        });

        it('Rejects invalid import statement (missing modules)', function() {
            return check_juttle({
                program: 'import ; emit | view sink'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            });
        });

        it('Accepts valid import statements (parseSync)', function() {
            return parser.parseSync('import "mod1" as mod1; import "mod2" as mod2;  emit | view sink',
                                    { modules: moduleLibrary });
        });

        it('Accepts recursive import statements (parseSync)', function() {
            return parser.parseSync('import "cycle1" as cycle1;  emit | view sink',
                                    { modules: moduleLibrary });
        });

        it('Rejects an invalid import statement (multiple modules)', function() {
            return check_juttle({
                program: 'import "mod1" "mod2"; emit | view sink'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            });
        });

        it('Rejects an invalid import statement (missing "as")', function() {
            return check_juttle({
                program: 'import "mod1"; emit | view sink'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            });
        });

        it('Rejects an import statement inside a function', function() {
            return check_juttle({
                program: 'function f() { import "mod1" as m1;} emit | view sink'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            });
        });

        it('Rejects an import statement inside a sub', function() {
            return check_juttle({
                program: 'sub p() { import "a" as a; emit | view sink} emit | view sink'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.equal('Cannot import from within a sub');
            });
        });

        it('Accepts valid export statements', function() {
            var resolver = moduleResolver({
                mod: ['export const a=1, b=2;',
                      'const c=2, d=4;',
                      'export function f() { var a=1;}',
                      'function g() { var a=1;}',
                      'export sub p() { emit | view sink  }',
                      'sub q() { emit | view sink2 }'].join('\n')
            });

            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit -from Date.new(0) -limit 1 | view sink'
            });
        });

        it('Rejects an export statement in a function', function() {
            var resolver = moduleResolver({
                mod:'function f() { export const a=1;}'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit | view sink'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.match(/Cannot export from within a fn/);
            });
        });

        it('Rejects an export statement in a sub ', function() {
            return check_juttle({
                program: 'sub p() { export const a=1; emit | view sink} emit | view sink'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.equal('Cannot export from within a sub');
            });
        });

        it('Throws an error when an imported module name is used in a by list', function() {
            // delete this and enable skipped test in variable.spec.md when PROD-7136 goes in
            var resolver = moduleResolver({
                mod:'export const a = 1;'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit -limit 1 | keep m'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.match(/Cannot use a module as a variable/);
            });
        });

        it('Throws an error when an imported module name is used in a const declaration', function() {
            // delete this and enable skipped test in variable.spec.md when PROD-7136 goes in
            var resolver = moduleResolver({
                mod:'export const a = 1;'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; const c = m; emit -limit 1'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.match(/Cannot use a module as a variable/);
            });
        });

        it('Throws an error when an imported module name is used in a stream expression', function() {
            // delete this and enable skipped test in variable.spec.md when PROD-7136 goes in
            var resolver = moduleResolver({
                mod:'export const a = 1;'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit -limit 1 | put a = m'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.match(/Cannot use a module as a variable/);
            });
        });

        // Regression test for PROD-8264.
        it('Throws an error when a module uses variable form the importing program', function() {
            var resolver = moduleResolver({
                mod:'export const inner = outer;'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'const outer = 5; import "mod" as m;'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.match(/outer is not defined/);
            });
        });

        it('Throws an error when importing modules under the same identifier', function() {
            var resolver = moduleResolver({
                mod1: 'const foo="bar";',
                mod2: 'const foo="bar";'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod1" as m; import "mod2" as m;'
            })
            .then(function() {
                throw new Error('Should have thrown an error');
            })
            .catch(function(err) {
                expect(err.message).to.match(/redefined import: m/);
            });
        });
    });

    describe('Modules: running', function() {

        it('Import/export consts', function() {
            var resolver = moduleResolver({
                mod:'export const two = 2;' +
                    'export const three = 3;'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; const three = m.two + 1; emit -from Date.new(0) -limit 1 | put a = m.three, b = three | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 3, b: 3 } ]);
            });
        });

        it('Non-identifier module name', function() {
            var resolver = moduleResolver({
                'http://a/b/c.juttle': 'export const one = 1;'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "http://a/b/c.juttle" as m; emit -from Date.new(0) -limit 1 | put a = m.one | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 1} ]);
            });
        });

        it('Import/export fns and reducers', function() {
            var resolver = moduleResolver({
                mod:'export function add1(x) { return x + 1;}' +
                    'export reducer last(field) { ' +
                    '  var r = 0; ' +
                    '  function update() { r = *field; }' +
                    '  function result() { return r; }' +
                    '}'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; const one=1;  emit -from Date.new(0) -limit 2 | put two=m.add1(one) | reduce two=max("two"), last_t = m.last("time") | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { two: 2, last_t: '1970-01-01T00:00:01.000Z' } ]);
            });
        });
        it('Import/export subs', function() {
            var resolver = moduleResolver({
                mod: 'const one = 1; export sub put_plus_one(n) { put a=n + one }'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit -from Date.new(0) -limit 1 | m.put_plus_one -n 1 | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 2}] );
            });
        });

        it('Nested import/export consts', function() {
            var resolver = moduleResolver({
                nested: 'export const two = 2;' +
                    'export const three = 3;',
                mod:'import "nested" as n;' +
                    'export const two = n.two;' +
                    'export const three = n.three;'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; const three = m.two + 1; emit -limit 1 -from Date.new(0) | put a = m.three, b = three | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 3, b: 3 } ]);
            });
        });

        it('Nested import/export consts (parseSync)', function() {
            var lib = {
                nested: 'export const two = 2;' +
                    'export const three = 3;',
                mod:'import "nested" as n;' +
                    'export const two = n.two;' +
                    'export const three = n.three;'
            };
            return check_juttle({
                program: 'import "mod" as m; const three = m.two + 1; emit -limit 1 -from Date.new(0) | put a = m.three, b = three | view result',
                modules: lib
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 3, b: 3 } ]);
            });
        });

        it('Nested import/export fns ', function() {
            var resolver = moduleResolver({
                nested: 'export function add1(x) { return x + 1;}',
                mod:'import "nested" as n;' +
                    'export function add1(x) { return n.add1(x); }' +
                    'export reducer last(field) { ' +
                    '  var r = 0; ' +
                    '  function update() { r = *field; }' +
                    '  function result() { return r; }' +
                    '}'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; const one=1;  emit -limit 2 -from Date.new(0) | put two=m.add1(one) | reduce two=max("two"), last_t = m.last("time") | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { two: 2, last_t: '1970-01-01T00:00:01.000Z' } ]);
            });
        });
        it('Nested import/export subs', function() {
            var resolver = moduleResolver({
                nested:'const one = 1; export sub put_plus_one_(n) { put a=n + one }',
                mod: 'import "nested" as n; export sub put_plus_one(x) { n.put_plus_one_ -n x }'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit -from Date.new(0) -limit 1 | m.put_plus_one -x 1 | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 2}] );
            });
        });

        it('Ignore top-level flowgraphs in modules', function() {
            var resolver = moduleResolver({
                mod:'export const two = 2;' +
                    'export const three = 3;' +
                    'emit | view ignored'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; const three = m.two + 1; emit -from Date.new(0) -limit 1 | put a = m.three, b = three | view result'
            })
            .then(function(res) {
                expect(res.sinks.ignored).to.be.undefined;
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 3, b: 3 } ]);
            });
        });

        it('Same module imported via two paths', function() {
            var resolver = moduleResolver({
                'a': 'export const a = 1;',
                'b': 'import "a" as a; export const b = a.a + 1;',
                'c': 'import "a" as a; export const c = a.a + 1;',
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "b" as b; import "c" as c; emit -from :0: -limit 1 | put f = c.c | view result',
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', f: 2} ]);
            });
        });

        it('Doesn\'t break when using a function from a module that also exports a const (PROD-7786)', function() {
            var resolver = moduleResolver({
                mod: 'export const one = 1; export function simple() {return 2;}'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit -from :0: -limit 1 | put a = m.simple() | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { time: '1970-01-01T00:00:00.000Z', a: 2} ]);
            });
        });

        it('Doesn\'t break when using a reducer from a module that also exports a const (PROD-7786)', function() {
            var resolver = moduleResolver({
                mod: 'export const one = 1; export reducer r() {function update() { } function result() {return 2;}}'
            });
            return check_juttle({
                moduleResolver: resolver,
                program: 'import "mod" as m; emit -from :0: -limit 1 | reduce r = m.r() | view result'
            })
            .then(function(res) {
                expect(res.sinks.result)
                    .deep.equal([ { r: 2} ]);
            });
        });

        it('Doesn\'t infinite-loop on cyclic imports', function() {
            var resolver = moduleResolver({
                'mod': 'export const m = 1;',
                'cycle1': 'import "mod" as m; import "cycle3" as cycle3; ',
                'cycle2': 'import "mod" as m; import "cycle1" as cycle1;',
                'cycle3': 'import "mod" as m; import "cycle2" as cycle2;'
            });

            return check_juttle({
                moduleResolver: resolver,
                program: 'import "cycle1" as cycle1;  emit | view sink'
            })
            .then(function(res) {
                throw new Error('Should have detected cycle and errored!');
            })
            .catch(function(err) {
                expect(err.message).to.contain('Import cycle detected (cycle1 -> cycle3 -> cycle2 -> cycle1)');
            });
        });

        describe('With the file resolver', function() {
            var file_resolver = new FileResolver();
            it('Can import a module from a relative pathname', function() {
                return check_juttle({
                    moduleResolver: file_resolver.resolve,
                    program: `import "${__dirname}/juttles/index.juttle" as m; emit -limit 1 | put x=m.value | view sink`,
                })
                .then(function(res) {
                    expect(res.sinks.sink[0].x).to.equal(10);
                });
            });

            it('Can import a module from a directory', function() {
                return check_juttle({
                    moduleResolver: file_resolver.resolve,
                    program: `import "${__dirname}/juttles" as m; emit -limit 1 | put x=m.value | view sink`,
                })
                .then(function(res) {
                    expect(res.sinks.sink[0].x).to.equal(10);
                });
            });

            it('Can import a nested set of modules from relative pathnames', function() {
                return check_juttle({
                    moduleResolver: file_resolver.resolve,
                    program: `import "${__dirname}/juttles/subdir/index.juttle" as m; emit -limit 1 | put x=m.value | view sink`,
                })
                .then(function(res) {
                    expect(res.sinks.sink[0].x).to.equal(10);
                });
            });

            it('Can import a nested set of modules from relative pathnames with duplicates', function() {
                return check_juttle({
                    moduleResolver: file_resolver.resolve,
                    program: `import "${__dirname}/juttles/subdir/subdir2/index.juttle" as m; emit -limit 1 | put x=m.value | view sink`,
                })
                .then(function(res) {
                    expect(res.sinks.sink[0].x).to.equal(10);
                });
            });
        });
    });
});

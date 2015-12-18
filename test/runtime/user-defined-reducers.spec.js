
var _ = require('underscore');

var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var expect = require('chai').expect;


describe('Juttle user-defined reducer tests', function() {
    // XXX function bodies must have at least 1 statement, making
    // some of the programs below feel unnecessarily verbose

    it('rejects a reducer without a result method', function() {
        return check_juttle({
            program: [ 'reducer foo() {',
                       '  var v;',
                       '  function update() { v=0; }',
                       '}',
                       '',
                       'emit' ].join(' ')
        })
            .then(function() {
                throw new Error('should have failed');
            })
            .catch(function(err) {
                expect(err.message).match(/missing result/);
            } );
    } );

    it('rejects a reducer without an update method', function() {
        return check_juttle({
            program: [ 'reducer foo() {',
                       '  var v;',
                       '  function result() { v=0; }',
                       '}',
                       '',
                       'emit' ].join(' ')
        })
            .then(function() {
                throw new Error('should have failed');
            })
            .catch(function(err) {
                expect(err.message).match(/missing update/);
            } );
    } );

    it('rejects a result method with parameters', function() {
        return check_juttle({
            // XXX function bodies must have at least 1 statement...
            program: [ 'reducer foo() {',
                       '  var v;',
                       '  function result(x) { v=0; }',
                       '  function update() { v=0; }',
                       '}',
                       '',
                       'emit' ].join(' ')
        })
            .then(function() {
                throw new Error('should have failed');
            })
            .catch(function(err) {
                expect(err.message).match(/may not take arguments/);
            } );
    });

    it('rejects an update method with parameters', function() {
        return check_juttle({
            program: [ 'reducer foo() {',
                       '  var v;',
                       '  function result() { v=0; }',
                       '  function update(x) { v=0; }',
                       '}',
                       '',
                       'emit' ].join(' ')
        })
            .then(function() {
                throw new Error('should have failed');
            })
            .catch(function(err) {
                expect(err.message).match(/may not take arguments/);
            } );
    });

    // regression test for PROD-4431
    it('rejects a reducer with the result method outside the reducer body', function() {
        return check_juttle({
            program: [ 'function result() { return 1; }',
                       'reducer foo() {',
                       '  function update() { return 1; }',
                       '}',
                       '',
                       'emit' ].join(' ')
        })
            .then(function() {
                throw new Error('should have failed');
            })
            .catch(function(err) {
                expect(err.message).match(/missing result/);
            } );
    } );

    // regression test for PROD-4431
    it('rejects a reducer with the update method outside the reducer body', function() {
        return check_juttle({
            program: [ 'function update() { return 1; }',
                       'reducer foo() {',
                       '  function result() { return 1; }',
                       '}',
                       '',
                       'emit' ].join(' ')
        })
            .then(function() {
                throw new Error('should have failed');
            })
            .catch(function(err) {
                expect(err.message).match(/missing update/);
            } );
    } );

    it('accepts a function expression as an argument', function() {
        return check_juttle({
            program: [ 'reducer r(i) {',
                       '  function result() { return i; }',
                       '  function update() { return 1; }',
                       '}',
                       'function f() { return 3; }',
                       'emit -from Date.new(0) -limit 5',
                       '  | batch 1 | put b=r(f()) | view result'
                     ].join(' ')
        })
            .then(function(res) {
                var result = res.sinks.result;
                expect(result.length).equal(5);
                _.each(result, function(v) {
                    expect(v.b).equal(3);
                } );
            } );
    } );

    it('accepts a sub argument as an argument', function() {
        return check_juttle({
            program: [ 'sub r(fname) { reduce a=last(fname) }',
                       'emit -from Date.new(0) -limit 5',
                       '  | batch 1 | put a=1 | r -fname \'a\' | view result'
                     ].join(' ')
        })
            .then(function(res) {
                var result = res.sinks.result;
                expect(result.length).equal(5);
                _.each(result, function(v) {
                    expect(v.a).equal(1);
                } );
            } );
    } );

    it('variable in function-in-reducer scope masks a top-level const', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'reducer myred() {' +
                '  function result() {' +
                '    var foo=1.2;' +
                '    return foo;' +
                '  }' +
                '  function update() {' +
                '  return 0; ' +
                '  }' +
                '}' +
                'emit -limit 1 | reduce myred() | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{myred: 1.2}]);
        });
    });

    it('variable in reducer scope masks a top-level const', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'reducer myred() {' +
                '  var foo=1.2;' +
                '  function result() {' +
                '    return foo;' +
                '  }' +
                '  function update() {' +
                '  return 0; ' +
                '  }' +
                '}' +
                'emit -limit 1 | reduce myred() | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{myred: 1.2}]);
        });
    });

    it('reducer argument masks a top-level const', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'reducer myred(foo) {' +
                '  function result() {' +
                '    return foo;' +
                '  }' +
                '  function update() {' +
                '  return 0; ' +
                '  }' +
                '}' +
                'emit -limit 1 | reduce myred(1.2) | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{myred: 1.2}]);
        });
    });

    it('variable in function-in-reducer scope masks a reducer const', function() {
        return check_juttle({
            program:
                'reducer myred() {' +
                '  const foo=2.4;' +
                '  function result() {' +
                '    var foo=1.2;' +
                '    return foo;' +
                '  }' +
                '  function update() {' +
                '  return 0; ' +
                '  }' +
                '}' +
                'emit -limit 1 | reduce myred() | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{myred: 1.2}]);
        });
    });

    it('argument in function-in-reducer scope masks a top-level const', function() {
        return check_juttle({
            program:
                'const foo=2.4;' +
                'reducer myred() {' +
                '  function aux(foo) {' +
                '    return foo;' +
                '  }' +
                '  function result() {' +
                '  return aux(1.2); ' +
                '  }' +
                '  function update() {' +
                '    return 0;' +
                '  }' +
                '}' +
                'emit -limit 1 | reduce myred() | view result'
        }).then(function(res) {
            expect(res.sinks.result).deep.equal([{myred: 1.2}]);
        });
    });
    // XXX check for return inside the main body?
    // XXX require return inside result?
});

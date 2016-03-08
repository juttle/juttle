'use strict';

var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var compile_juttle = juttle_test_utils.compile_juttle;
var check_juttle = juttle_test_utils.check_juttle;


describe('Juttle sinks validation', function() {
    var did_not_invalidate_err = new Error('Did not detect invalid graph!');

    function sink_options(prog, idx) {
        return prog.get_sinks()[idx].options;
    }

    it('counts a single terminal node', function() {
        return compile_juttle({program: 'emit | view result'})
            .then(function(program) {
                var sinks = program.get_sinks();
                var terminalNodes = program.get_terminal_nodes();

                expect(sinks.length).to.equal(1);
                expect(terminalNodes.length).to.equal(1);
            });
    });
    it('counts multiple, parallel terminal nodes', function() {
        return compile_juttle({program: '( emit | view result1; emit | view result2 )'})
            .then(function(program) {

                var sinks = program.get_sinks();
                var terminalNodes = program.get_terminal_nodes();

                expect(sinks.length).to.equal(2);
                expect(terminalNodes.length).to.equal(2);
            });
    });

    it('implicit view table with a single flowgraph', function() {
        return compile_juttle({program: 'emit | put a = 1'})
            .then(function(program) {
                var sinks = program.get_sinks();
                expect(sinks.length).to.equal(1);
                expect(sinks[0].name).to.equal('table');
            });
    });

    it('implicit view table with a top-level parallel graph', function() {
        return compile_juttle({program: 'emit; emit'})
            .then(function(program) {
                var sinks = program.get_sinks();
                expect(sinks.length).to.equal(2);
                expect(sinks[0].name).to.equal('table');
                expect(sinks[1].name).to.equal('table');
            });
    });

    it('implicit view table with a top-level parallel graph (2)', function() {
        return compile_juttle({program: 'emit; emit | view text'})
            .then(function(program) {
                var sinks = program.get_sinks();
                expect(sinks.length).to.equal(2);
                expect(sinks[0].name).to.equal('table');
                expect(sinks[1].name).to.equal('text');
            });
    });

    it('implicit view table with a parallel graph inside a sequential graph', function() {
        return compile_juttle({program: 'emit | ( put roses="red"; put violets="blue") | keep roses'})
            .then(function(program) {
                var sinks = program.get_sinks();
                expect(sinks.length).to.equal(1);
                expect(sinks[0].name).to.equal('table');
            });
    });

    it('implicit view table with a parallel graph at end of sequential graph', function() {
        return compile_juttle({program: 'emit | ( put roses="red"; put violets="blue")'})
            .then(function(program) {
                var sinks = program.get_sinks();
                expect(sinks.length).to.equal(2);
                expect(sinks[0].name).to.equal('table');
                expect(sinks[1].name).to.equal('table');
            });
    });

    it('no implicit view table with a parallel graph inside a sequential graph', function() {
        return compile_juttle({program: 'emit | ( put roses="red"; put violets="blue") | view text'})
            .then(function(program) {
                var sinks = program.get_sinks();
                expect(sinks.length).to.equal(1);
                expect(sinks[0].name).to.equal('text');
            });
    });

    it('detects invalid graph with 2 view in series', function() {
        return compile_juttle({program: 'emit | view logger | view logger'})
            .then(function(program) {
                throw did_not_invalidate_err;
            } )
            .catch(function(err) {
                expect(err.message).to.match(/may not come after a sink/);
            });
    });

    it('sink option const array', function() {
        var opts = ['something'];
        return check_juttle({
            program: 'const opts = '+ JSON.stringify(opts) +'; emit -limit 1 | view result -foo opts'
        })
            .then(function(res) {
                expect(sink_options(res.prog, 0).foo).to.deep.equal(opts);
            });
    });

    it('sink option cost array + additional string', function() {
        var opts = ['something'];
        return check_juttle({
            program: 'const opts = '+ JSON.stringify(opts) +'; emit -limit 1 | view result -foo opts, "bar"'
        })
            .then(function(res) {
                expect(sink_options(res.prog, 0).foo).to.deep.equal([['something'], 'bar']);
            });
    });

    it('sink option function returning array', function() {
        var opts = ['something'];
        return check_juttle({
            program: 'function getOpts() { return '+ JSON.stringify(opts) +'; } emit -limit 1 | view result -foo getOpts()'
        })
            .then(function(res) {
                expect(sink_options(res.prog, 0).foo).to.deep.equal(opts);
            });
    });

    it('rejects a sink argument name with a double hyphen', function() {
        var program = 'emit -limit 1 | view result --foo 5';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            } );
    } );

    it('rejects a sink argument name with an equal sign', function() {
        var program = 'emit -limit 1 | view result -foo=5';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            } );
    } );

    it('rejects a sink argument name without a value', function() {
        var program = 'emit -limit 1 | view result -foo';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            } );
    } );

    it('handles dots for nested sink arguments', function() {
        var program = 'emit -limit 1 | view result -foo.bar.baz 5';
        var nested = {
            _jut_time_bounds: [],
            foo: {
                bar: {
                    baz: 5
                }
            }
        };

        return check_juttle({ program: program })
            .then(function(res) {
                expect(sink_options(res.prog, 0)).to.deep.equal(nested);
            } );
    } );

    it('rejects a sink argument name with a leading dot', function() {
        var program = 'emit -limit 1 | view result -.foo.bar 5';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            } );
    } );

    it('rejects a sink argument name with a trailing dot', function() {
        var program = 'emit -limit 1 | view result -foo.bar. 5';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            } );
    } );

    it('rejects a sink argument name with consecutive dots', function() {
        var program = 'emit -limit 1 | view result -foo..bar 5';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('SyntaxError');
            } );
    } );

    it('rejects a nested sink argument under a value', function() {
        var program = 'emit -limit 1 | view result -foo 5 -foo.bar 10';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('CompileError');
            } );
    } );

    it('rejects a nested sink argument under an array', function() {
        var program = 'emit -limit 1 | view result -foo [1,2] -foo.bar 10';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('CompileError');
            } );
    } );

    it('rejects a nested sink argument under a date', function() {
        var program = 'emit -limit 1 | view result -foo :now: -foo.bar 10';
        return check_juttle({ program: program })
            .then(function() {
                throw new Error('this should fail');
            })
            .catch(function(err) {
                expect(err.name).to.equal('CompileError');
            } );
    } );
});

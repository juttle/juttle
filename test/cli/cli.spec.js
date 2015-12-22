
var expect = require('chai').expect;
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));
var runJuttle = require('./util').runJuttle;
var tmp = require('tmp');

describe('Juttle CLI Tests', function() {

    describe('juttle', function() {
        it('can see the correct running juttle version', function() {
            var version = require('../../package.json').version;
            return runJuttle(['--version'])
                .then(function(result) {
                    expect(result.code).to.equal(0);
                    expect(result.stdout).to.equal(version + '\n');
                });
        });

        it('can execute a juttle file', function() {
            return runJuttle(['test/cli/juttles/hello_world.juttle'])
                .then(function(result) {
                    expect(result.code).to.equal(0);
                    expect(JSON.parse(result.stdout)).to.deep.equal([{
                        message: 'hello world'
                    }]);
                    expect(result.stderr).to.equal('');
                });
        });

        it('can execute juttle with the -e option', function() {
            return runJuttle([
                '-e',
                'emit -limit 3 -every :1ms: | put value=count() | keep value | view text -format "json"'
            ]).then(function(result) {
                expect(result.code).to.equal(0);
                expect(JSON.parse(result.stdout)).to.deep.equal([
                    {value: 1},
                    {value: 2},
                    {value: 3}
                ]);
                expect(result.stderr).to.equal('');
            });
        });

        it('can show a parse tree', function() {
            return runJuttle([
                '--mode',
                'parse',
                '-e',
                'emit'
            ])
            .then(function(result) {
                var ast = JSON.parse(result.stdout);
                expect(ast.type).to.equal("MainModuleDef");
                expect(ast.name).to.equal("main");
                expect(ast.location).is.undefined;
                expect(ast.elements[0].elements[0].name).to.equal("emit");
                expect(ast.elements[0].location).is.undefined;
            });
        });

        it('can show a parse tree with locations', function() {
            return runJuttle([
                '--mode',
                'parse',
                '--show-locations',
                '-e',
                'emit'
            ])
            .then(function(result) {
                var ast = JSON.parse(result.stdout);
                expect(ast.type).to.equal("MainModuleDef");
                expect(ast.name).to.equal("main");
                expect(ast.location).is.defined;
                expect(ast.location.start).is.defined;
                expect(ast.location.end).is.defined;
                expect(ast.elements[0].elements[0].name).to.equal("emit");
                expect(ast.elements[0].location).is.defined;
            });
        });

        it('handles invalid mode', function() {
            return runJuttle([
                '--mode',
                'bogus',
                'test/cli/juttles/hello_world.juttle'
            ]).then(function(result) {
                expect(result.code).to.equal(1);
                expect(result.stderr).to.include('error: invalid mode: bogus');
            });
        });

        it('handles nonexistent juttle', function() {
            return runJuttle([
                '--mode',
                'parse',
                'not.even.real.juttle'
            ]).then(function(result) {
                expect(result.code).to.equal(1);
                expect(result.stderr).to.include('no such file');
            });
        });

        it('exits with nonzero code if invalid juttle passed', function() {
            return runJuttle([
                '-e',
                '#emit',
            ]).then(function(result) {
                expect(result.code).to.equal(1);
                expect(result.stderr).to.include('SYNTAX-ERROR');
            });
        });

        it('returns an error for a program with an unknown view', function() {
            return runJuttle([
                '-e',
                'emit -limit 1 | view noview',
            ]).then(function(result) {
                expect(result.code).to.equal(1);
                expect(result.stderr).to.include('Error: program refers to invalid client view \"noview\" (RT-INVALID-VIEW)');
            });
        });

        it('resolves stdlib modules', function() {
            return runJuttle([
                '-e',
                'import "select.juttle" as select; emit -limit 2 | put c = count() | select.max -field "c" | keep c | view text -format "json"',
            ]).then(function(result) {
                expect(result.code).to.equal(0);
                expect(JSON.parse(result.stdout)).to.deep.equal([
                    {c: 2},
                ]);
            });
        });

        it('gracefully fails to resolve stdlib modules', function() {
            return runJuttle([
                '-e',
                'import "select-does-not-exist.juttle" as select; emit -limit 2 | put c = count() | select.max -field "c" | keep c | view text -format "json"',
            ]).then(function(result) {
                expect(result.code).to.equal(1);
                expect(result.stderr).to.include('could not find module');
            });
        });

        it('resolves url modules', function() {
            return runJuttle([
                '-e',
                'import "https://gist.githubusercontent.com/go-oleg/8a71831b9fecd4f3250d/raw/1a622943b6e3ac7712942bb4e2cd6f8ec04136ad/main.juttle" as lib; emit -limit 1 | put v = lib.a | keep v | view text -format "json"',
            ]).then(function(result) {
                expect(result.code).to.equal(0);
                expect(JSON.parse(result.stdout)).to.deep.equal([
                    {v: 52},
                ]);
            });
        });

        it('gracefully fails to resolve inexistant url modules', function() {
            return runJuttle([
                '-e',
                'import "https://gist.githubusercontent.com/go-oleg/8a71831b9fecd4f3250d/raw/1a622943b6e3ac7712942bb4e2cd6f8ec04136ad/main-non-existant.juttle" as lib; emit -limit 1 | put v = lib.a | keep v | view text -format "json"',
            ]).then(function(result) {
                expect(result.code).to.equal(1);
                expect(result.stderr).to.include('could not find module');
            });
        });

        it('doesnt hang on module loading error', function() {
            return runJuttle([
                '-e',
                'import "nonexistent.juttle" as nonexistent;',
            ]).then(function(result) {
                expect(result.code).to.equal(1);
            });
        });

        it('returns errors for modules containing a syntax error', function() {
            return runJuttle([
                '-e',
                'import "test/cli/juttles/syntax-error.juttle" as error;',
            ]).then(function(result) {
                expect(result.code).to.equal(1);
                expect(result.stderr).to.include('In module included from <input>');
                expect(result.stderr).to.include('Not Juttle');
                expect(result.stderr).to.include('SYNTAX-ERROR');
            });
        });

        it('can execute a juttle that writes to a file', function() {
            var filename = tmp.tmpNameSync();
            return runJuttle(['-e', 'emit -limit 3 -hz 3 | put value=count() | keep value | view file -filename "' + filename + '"'])
                .then(function(result) {
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.equal('');
                    return fs.readFileAsync(filename, 'utf8')
                        .then(function(data) {
                            expect(JSON.parse(data)).to.deep.equal([
                                {value: 1},
                                {value: 2},
                                {value: 3}
                            ]);
                        });
                });
        });

        it('can display a field with a null value in "view table"', function() {
            return runJuttle(['-e', 'emit -from :2015-01-01: -limit 1 | put n = null | view table'])
                .then(function(result) {
                    expect(result.stdout).equals(
'┌────────────────────────────────────┬──────────┐\n' +
'│ time                               │ n        │\n' +
'├────────────────────────────────────┼──────────┤\n' +
'│ 2015-01-01T00:00:00.000Z           │          │\n' +
'└────────────────────────────────────┴──────────┘\n');
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.equal('');
                });
        });

        it('can display a title with "view table"', function() {
            return runJuttle(['-e', 'emit -from :2015-01-01: -limit 1 | put n = 100 | view table -title "My Table"'])
                .then(function(result) {
                    expect(result.stdout).equals(
'My Table\n' +
'┌────────────────────────────────────┬──────────┐\n' +
'│ time                               │ n        │\n' +
'├────────────────────────────────────┼──────────┤\n' +
'│ 2015-01-01T00:00:00.000Z           │ 100      │\n' +
'└────────────────────────────────────┴──────────┘\n');
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.equal('');
                });
        });

        it('does not interleave output from multiple table views', function() {
            return runJuttle(['-e', 'emit -from :2015-01-01: -limit 2 | (put sink = 1 | view table; put sink = 2 | view table)'])
                .then(function(result) {
                    expect(result.stdout).equals(
'┌──────────────────────────┬──────┐\n' +
'│ time                     │ sink │\n' +
'├──────────────────────────┼──────┤\n' +
'│ 2015-01-01T00:00:00.000Z │ 1    │\n' +
'├──────────────────────────┼──────┤\n' +
'│ 2015-01-01T00:00:01.000Z │ 1    │\n' +
'└──────────────────────────┴──────┘\n' +
'┌──────────────────────────┬──────┐\n' +
'│ time                     │ sink │\n' +
'├──────────────────────────┼──────┤\n' +
'│ 2015-01-01T00:00:00.000Z │ 2    │\n' +
'├──────────────────────────┼──────┤\n' +
'│ 2015-01-01T00:00:01.000Z │ 2    │\n' +
'└──────────────────────────┴──────┘\n');
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.equal('');
                });
        });

        it('interleaves output from multiple table views in progressive mode', function() {
            return runJuttle(['-e', 'emit -from :2015-01-01: -limit 2 | (put sink = 1 | view table -progressive true; put sink = 2 | view table -progressive true)'])
                .then(function(result) {
                    expect(result.stdout).equals(
'┌────────────────────────────────────┬──────────┐\n' +
'│ time                               │ sink     │\n' +
'├────────────────────────────────────┼──────────┤\n' +
'│ 2015-01-01T00:00:00.000Z           │ 1        │\n' +
'┌────────────────────────────────────┬──────────┐\n' +
'│ time                               │ sink     │\n' +
'├────────────────────────────────────┼──────────┤\n' +
'│ 2015-01-01T00:00:00.000Z           │ 2        │\n' +
'├────────────────────────────────────┼──────────┤\n' +
'│ 2015-01-01T00:00:01.000Z           │ 1        │\n' +
'├────────────────────────────────────┼──────────┤\n' +
'│ 2015-01-01T00:00:01.000Z           │ 2        │\n' +
'└────────────────────────────────────┴──────────┘\n' +
'└────────────────────────────────────┴──────────┘\n');
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.equal('');
                });
        });

        it('does not interleave output from multiple text views', function() {
            return runJuttle(['-e', 'emit -from :2015-01-01: -limit 2 | (put sink = 1 | view text; put sink = 2 | view text)'])
                .then(function(result) {
                    expect(result.stdout).equals(
'[\n' +
'{"time":"2015-01-01T00:00:00.000Z","sink":1},\n' +
'{"time":"2015-01-01T00:00:01.000Z","sink":1}\n' +
']\n' +
'[\n' +
'{"time":"2015-01-01T00:00:00.000Z","sink":2},\n' +
'{"time":"2015-01-01T00:00:01.000Z","sink":2}\n' +
']\n');
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.equal('');
                });
        });

        it('interleaves output from multiple text views in progressive mode', function() {
            return runJuttle(['-e', 'emit -from :2015-01-01: -limit 2 | (put sink = 1 | view text -progressive true; put sink = 2 | view text -progressive true)'])
                .then(function(result) {
                    expect(result.stdout).equals(
'[\n' +
'{"time":"2015-01-01T00:00:00.000Z","sink":1}[\n' +
'{"time":"2015-01-01T00:00:00.000Z","sink":2},\n' +
'{"time":"2015-01-01T00:00:01.000Z","sink":1},\n' +
'{"time":"2015-01-01T00:00:01.000Z","sink":2}\n' +
']\n' +
'\n' +
']\n');
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.equal('');
                });
        });

        it('can execute juttle with text inputs', function() {
            return runJuttle([
                '--input',
                'msg=hello',
                '-e',
                'input msg: text; emit -from :0: -limit 1 | put message=msg | keep message | view text -format "json"'
            ]).then(function(result) {
                expect(result.code).to.equal(0);
                expect(JSON.parse(result.stdout)).to.deep.equal([
                    {message: "hello"}
                ]);
                expect(result.stderr).to.equal('');
            });
        });

        it('can execute juttle with number inputs', function() {
            return runJuttle([
                '--input',
                'N=2',
                '-e',
                'input N: number; emit -from :0: -limit N | put value=count() | keep value | view text -format "json"'
            ]).then(function(result) {
                expect(result.code).to.equal(0);
                expect(JSON.parse(result.stdout)).to.deep.equal([
                    {value: 1},
                    {value: 2}
                ]);
                expect(result.stderr).to.equal('');
            });
        });

        it('can execute juttle with default values for number inputs', function() {
            return runJuttle([
                '-e',
                'input N: number -default 1; const count = N + 1; emit -from :0: -limit count | put value=count() | keep value | view text -format "json"'
            ]).then(function(result) {
                expect(result.stderr).to.equal('');
                expect(result.code).to.equal(0);
                expect(JSON.parse(result.stdout)).to.deep.equal([
                    {value: 1},
                    {value: 2}
                ]);
            });
        });

        // XXX broken until the CLI supports default values for inputs
        it.skip('can execute juttle with implicit default values for number inputs', function() {
            return runJuttle([
                '-e',
                'input N: number; const count = N + 1; emit -from :0: -limit count | put value=count() | keep value | view text -format "json"'
            ]).then(function(result) {
                expect(result.stderr).to.equal('');
                expect(result.code).to.equal(0);
                expect(JSON.parse(result.stdout)).to.deep.equal([
                    {value: 1},
                    {value: 2}
                ]);
            });
        });

    });

    describe('juttle REPL', function() {
        it('can exit', function() {
            return runJuttle([], {
                    stdin: 'emit -limit 1\n' +
                           'exit\n'
                }).then(function(result) {
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.not.include('no such sub');
                });
        });

        it('can clear screen', function() {
            return runJuttle([], {
                    stdin: 'emit -limit 1\n' +
                           'clear\n' +
                           'exit\n'
                }).then(function(result) {
                    expect(result.code).to.equal(0);
                    expect(result.stderr).to.not.include('no such sub');
                });
        });

        it('can display help', function() {
            return runJuttle([], {
                    stdin: 'emit -limit 0\n' +
                           'help\n' +
                           'exit\n'
                }).then(function(result) {
                    expect(result.code).to.equal(0);
                    expect(result.stdout).to.include('print this usage');
                });
        });

        it('can execute a program interactively', function() {
            return runJuttle([], {
                stdin: 'emit -limit 1 | put message="hello world" | view text -format "json"\n' +
                       'exit\n'
            }).then(function(result) {
                expect(result.code).to.equal(0);
                expect(result.stdout).to.include('hello world');
                expect(result.stderr).to.not.include('no such sub');
            });
        });
    });
});

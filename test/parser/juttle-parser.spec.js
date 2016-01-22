var expect = require('chai').expect;
var Promise = require('bluebird');
var _ = require('underscore');

var parser = require('../../lib/parser/juttle-parser');


describe('Juttle parser', function() {
    var mod = {
        source: 'export const foo = 42;',
        name: 'foo'
    };
    var lib = { foo: mod.source };
    var parserOpts = {
        moduleResolver: function(name) {
            if (name === mod.name) {
                return Promise.resolve(mod);
            }
            throw new Error('could not find module ' + name);
        }
    };

    it('tries out a simple programs with no modules', function() {
        var program = 'emit -from :5: | put a=(5*10) | view table';
        var ast1 = parser.parseSync(program);

        var ast = parser.parseSync(program, { modules: {} });

        return parser.parse(program).then(function(res) {
            expect(ast).to.deep.equal(ast1);
        });
    });

    it('fails if a module is imported without moduleResolver', function() {
        var got_error = false;
        var program = 'import "foo" as fool;\n emit -from :5: | put a=(5*10) | view table';

        return parser.parse(program).catch(function(err) {
            got_error = true;
            expect(err).to.be.an.instanceof(Error);
        }).then(function() {
            if (! got_error) {
                throw new Error('shouldn\'t be here');
            }
        });
    });

    it('successfully imports a module (moduleResolver)', function() {
        var program = 'import "foo" as fool;\n emit -from :5: | put a=(5*10) | view table';

        return parser.parse(program, parserOpts).then(function(ast) {
            expect(ast).to.be.an('object');
            expect(ast.name).to.equal('main');

            // make sure the module made it into the ast somewhere
            var has_module_def = _.some(ast.modules, function(elem) {
                return elem.type === 'ModuleDef' && elem.name === 'foo';
            });
            expect(has_module_def).to.be.ok;
        });
    });

    it('successfully imports a module (parseSync)', function() {
        var program = 'import "foo" as fool;\n emit -from :5: | put a=(5*10) | view table';

        var ast = parser.parseSync(program, { modules: lib });
        expect(ast).to.be.an('object');
        expect(ast.name).to.equal('main');

        // make sure the module made it into the ast somewhere
        var has_module_def = _.some(ast.modules, function(elem) {
            return elem.type === 'ModuleDef' && elem.name === mod.name;
        });
        expect(has_module_def).to.be.ok;
    });

    it('fails cleanly if a non-existent module is imported (moduleResolver)', function() {
        var program = 'import "fool" as fool;\n emit -from :5: | put a=(5*10) | view table';
        var got_error = false;

        return parser.parse(program, parserOpts).catch(function(err) {
            got_error = true;
            expect(err).to.be.an.instanceof(Error);
        }).then(function() {
            if (! got_error) {
                throw new Error('shouldn\'t be here');
            }
        });
    });

    it('fails cleanly if a non-existent module is imported (parseSync)', function() {
        var program = 'import "fool" as fool;\n emit -from :5: | put a=(5*10) | view table';

        try {
            parser.parseSync(program, { modules: lib });
            throw new Error('parsing should have failed');
        } catch (err) {
            expect(err).to.be.an.instanceof(Error);
            expect(err.message).match(/could not find module/);
        }
    });

    describe('autocomplete', function() {
        it('emits correct regions', function() {
            var option_ast = {
                from: {
                    type: 'MomentLiteral',
                    location: {
                        filename: 'main',
                        start: { offset: 11, line: 1, column: 12 },
                        end: { offset: 14, line: 1, column: 15 }
                    },
                    value: '1970-01-01T00:00:00.000Z'
                },
                display_limit: {
                    type: 'NumericLiteral',
                    location: {
                        filename: 'main',
                        start: { offset: 22, line: 1, column: 23 },
                        end: { offset: 23, line: 1, column: 24 }
                    },
                    value: 5
                },
                keyField: {
                    type: 'StringLiteral',
                    location: {
                        filename: 'main',
                        start: { offset: 21, line: 1, column: 22 },
                        end: { offset: 26, line: 1, column: 27 }
                    },
                    value: 'key'
                },
                valueField: {
                    type: 'StringLiteral',
                    location: {
                        filename: 'main',
                        start: { offset: 39, line: 1, column: 40 },
                        end: { offset: 46, line: 1, column: 47 }
                    },
                    value: 'value'
                },
                timeField: {
                    type: 'StringLiteral',
                    location: {
                        filename: 'main',
                        start: { offset: 58, line: 1, column: 59 },
                        end: { offset: 64, line: 1, column: 65 }
                    },
                    value: 'time'
                }
            };

            var testcases = [
                {
                    juttle: 'emit',
                    regions: [
                        { type: 'proc', placement: 'head', start: 0, end: 4 }
                    ]
                },
                {
                    juttle: 'emit -',
                    regions: [
                        { type: 'proc', placement: 'head', start: 0, end: 4 },
                        { type: 'option_name', proc: 'emit', prevOptions: [], start: 5, end: 6 }
                    ]
                },
                {
                    juttle: 'emit -from ',
                    regions: [
                        { type: 'proc', placement: 'head', start: 0, end: 4 },
                        { type: 'option_name', proc: 'emit', prevOptions: [], start: 5, end: 10 },
                        { type: 'option_value', proc: 'emit', prevOptions: [{ name: 'from', value: null }], start: 10, end: 11 }
                    ]
                },
                {
                    juttle: 'emit -from :0:',
                    regions: [
                        { type: 'proc', placement: 'head', start: 0, end: 4 },
                        { type: 'option_name', proc: 'emit', prevOptions: [], start: 5, end: 10 },
                        { type: 'option_value', proc: 'emit', prevOptions: [{ name:'from', value: option_ast.from }], start: 10, end: 11 }
                    ]
                }
            ];

            _.each(testcases, function(testcase) {
                var regions = [];

                try {
                    parser.parseSync(testcase.juttle, {
                        autocompleteCallback: function(region) {
                            regions.push(region);
                        }
                    });
                } catch (e) {
                    // Ignore errors in order to capture regions even from an
                    // unsuccessful parse.
                }

                expect(regions).to.deep.equal(testcase.regions, testcase.juttle);
            });
        });
    });
});

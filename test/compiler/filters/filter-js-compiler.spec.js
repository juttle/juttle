'use strict';

var chai = require('chai');
var expect = chai.expect;

var FilterJSCompiler = require('../../../lib/compiler/filters/filter-js-compiler.js');
var JuttleMoment = require('../../../lib/moment').JuttleMoment;
var parser = require('../../../lib/parser');
var SemanticPass = require('../../../lib/compiler/semantic');

// Needed to evaluate compiled Juttle code.
var juttle = require('../../../lib/runtime/runtime');   // eslint-disable-line

chai.use(function(chai, utils) {
    chai.Assertion.addMethod('filter', function(points, result) {
        /* jshint evil:true */

        var ast = parser.parseFilter(this._obj).ast;

        // We need to run the semantic pass to convert Variable nodes to field
        // references.
        var semantic = new SemanticPass();
        ast = semantic.sa_expr(ast);

        var compiler = new FilterJSCompiler();
        var fn = eval(compiler.compile(ast));
        var filtered = points.filter(fn);

        this.assert(
            utils.eql(filtered, result),
            'expected #{this} to filter points to #{exp} but it filtered it to #{act}',
            'expected #{this} to not filter points to #{exp} but it did',
            result,
            filtered,
            true
        );
    });
});

var POINTS_MISC = [
    { v: null                                         },
    { v: true                                         },
    { v: false                                        },
    { v: 5                                            },
    { v: Infinity                                     },
    { v: NaN                                          },
    { v: 'abcd'                                       },
    { v: new JuttleMoment('2015-01-01T00:00:00.000Z') },
    { v: JuttleMoment.duration('00:00:05.000')        }
];

var POINTS_NUMBERS = [
    { v: 1 },
    { v: 2 },
    { v: 3 }
];

var POINTS_STRINGS = [
    { v: 'abcd' },
    { v: 'efgh' },
    { v: 'ijkl' }
];

describe('FilterJSCompiler', function() {
    describe('literals', function() {
        it('handles null', function() {
            expect('v == null').to.filter(POINTS_MISC, [{ v: null }]);
        });

        it('handles booleans', function() {
            expect('v == true').to.filter(POINTS_MISC, [{ v: true }]);
        });

        it('handles numbers', function() {
            expect('v == 5').to.filter(POINTS_MISC, [{ v: 5 }]);
            expect('v == Infinity').to.filter(POINTS_MISC, [{ v: Infinity }]);
            // No value equals NaN, not even NaN.
            expect('v == NaN').to.filter(POINTS_MISC, []);
        });

        it('handles strings', function() {
            expect( 'v == "abcd"').to.filter(POINTS_MISC, [{ v: 'abcd' }]);
        });

        it('handles dates', function() {
            expect('v == :2015-01-01T00:00:00.000Z:').to.filter(
                POINTS_MISC,
                [{ v: new JuttleMoment('2015-01-01T00:00:00.000Z') }]
            );
        });

        it('handles durations', function() {
            expect('v == :00:00:05.000:').to.filter(
                POINTS_MISC,
                [{ v: JuttleMoment.duration('00:00:05.000') }]
            );
        });
    });

    describe('filter expressions', function() {
        describe('NOT', function() {
            it('finds correct points', function() {
                expect('NOT v == 2').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });
        });

        describe('AND', function() {
            it('finds correct points', function() {
                expect('v <= 2 AND v >= 2').to.filter(POINTS_NUMBERS, [{ v: 2 }]);
            });
        });

        describe('OR', function() {
            it('finds correct points', function() {
                expect('v <= 2 OR v >= 2').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 2 }, { v: 3 }]);
            });
        });
    });

    describe('expression terms', function() {
        describe('missing fields', function() {
            it('treats them as null', function() {
                expect('m == null').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 2 }, { v: 3 }]);
            });
        });

        describe('==', function() {
            it('finds correct points (field == expression)', function() {
                expect('v == 2').to.filter(POINTS_NUMBERS, [{ v: 2 }]);
            });

            it('finds correct points (expression == field)', function() {
                expect('v == 2').to.filter(POINTS_NUMBERS, [{ v: 2 }]);
            });
        });

        describe('!=', function() {
            it('finds correct points (field != expression)', function() {
                expect('v != 2').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });

            it('finds correct points (expression != field)', function() {
                expect('2 != v').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });
        });

        describe('=~', function() {
            it('finds correct points (field =~ expression)', function() {
                expect('v =~ "e*h"').to.filter(POINTS_STRINGS, [{ v: 'efgh' }]);
                expect('v =~ /e.*h/').to.filter(POINTS_STRINGS, [{ v: 'efgh' }]);
            });
        });

        describe('!~', function() {
            it('finds correct points (field !~ expression)', function() {
                expect('v !~ "e*h"').to.filter(POINTS_STRINGS, [{ v: 'abcd' }, { v: 'ijkl' }]);
                expect('v !~ /e.*h/').to.filter(POINTS_STRINGS, [{ v: 'abcd' }, { v: 'ijkl' }]);
            });
        });

        describe('<', function() {
            it('finds correct points (field < expression)', function() {
                expect('v < 2').to.filter(POINTS_NUMBERS, [{ v: 1 }]);
            });

            it('finds correct points (expression < field)', function() {
                expect('2 < v').to.filter(POINTS_NUMBERS, [{ v: 3 }]);
            });
        });

        describe('>', function() {
            it('finds correct points (field > expression)', function() {
                expect('v > 2').to.filter(POINTS_NUMBERS, [{ v: 3 }]);
            });

            it('finds correct points (expression > field)', function() {
                expect('2 > v').to.filter(POINTS_NUMBERS, [{ v: 1 }]);
            });
        });

        describe('<=', function() {
            it('finds correct points (field <= expression)', function() {
                expect('v <= 2').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 2 }]);
            });

            it('finds correct points (expression <= field)', function() {
                expect('2 <= v').to.filter(POINTS_NUMBERS, [{ v: 2 }, { v: 3 }]);
            });
        });

        describe('>=', function() {
            it('finds correct points (field >= expression)', function() {
                expect('v >= 2').to.filter(POINTS_NUMBERS, [{ v: 2 }, { v: 3 }]
                );
            });

            it('finds correct points (expression >= field)', function() {
                expect('2 >= v').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 2 }]);
            });
        });

        describe('in', function() {
            it('finds correct points (field in expression)', function() {
                expect('v in [1, 3]').to.filter(POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });
        });
    });
});

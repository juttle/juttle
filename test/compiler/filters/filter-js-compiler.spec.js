'use strict';

var expect = require('chai').expect;

var FilterJSCompiler = require('../../../lib/compiler/filters/filter-js-compiler.js');
var JuttleMoment = require('../../../lib/moment').JuttleMoment;
var parser = require('../../../lib/parser');
var SemanticPass = require('../../../lib/compiler/semantic');

// Needed to evaluate compiled Juttle code.
var juttle = require('../../../lib/runtime/runtime');   // eslint-disable-line

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
    function testFilter(filter, points, expected) {
        /* jshint evil:true */

        var ast = parser.parseFilter(filter).ast;

        // We need to run the semantic pass to convert Variable nodes to field
        // references.
        var semantic = new SemanticPass();
        ast = semantic.sa_expr(ast);

        var compiler = new FilterJSCompiler();
        var fn = eval(compiler.compile(ast));

        expect(points.filter(fn)).to.deep.equal(expected);
    }

    describe('literals', function() {
        it('handles null', function() {
            testFilter('v == null', POINTS_MISC, [{ v: null }]);
        });

        it('handles booleans', function() {
            testFilter('v == true', POINTS_MISC, [{ v: true }]);
        });

        it('handles numbers', function() {
            testFilter('v == 5', POINTS_MISC, [{ v: 5 }]);
            testFilter('v == Infinity', POINTS_MISC, [{ v: Infinity }]);
            // No value equals NaN, not even NaN.
            testFilter('v == NaN', POINTS_MISC, []);
        });

        it('handles strings', function() {
            testFilter( 'v == "abcd"', POINTS_MISC, [{ v: 'abcd' }]);
        });

        it('handles dates', function() {
            testFilter(
                'v == :2015-01-01T00:00:00.000Z:',
                POINTS_MISC,
                [{ v: new JuttleMoment('2015-01-01T00:00:00.000Z') }]
            );
        });

        it('handles durations', function() {
            testFilter(
                'v == :00:00:05.000:',
                POINTS_MISC,
                [{ v: JuttleMoment.duration('00:00:05.000') }]
            );
        });
    });

    describe('filter expressions', function() {
        describe('NOT', function() {
            it('finds correct points', function() {
                testFilter('NOT v == 2', POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });
        });

        describe('AND', function() {
            it('finds correct points', function() {
                testFilter('v <= 2 AND v >= 2', POINTS_NUMBERS, [{ v: 2 }]);
            });
        });

        describe('OR', function() {
            it('finds correct points', function() {
                testFilter('v <= 2 OR v >= 2', POINTS_NUMBERS, [{ v: 1 }, { v: 2 }, { v: 3 }]);
            });
        });
    });

    describe('expression terms', function() {
        describe('missing fields', function() {
            it('treats them as null', function() {
                testFilter('m == null', POINTS_NUMBERS, [{ v: 1 }, { v: 2 }, { v: 3 }]);
            });
        });

        describe('==', function() {
            it('finds correct points (field == expression)', function() {
                testFilter('v == 2', POINTS_NUMBERS, [{ v: 2 }]);
            });

            it('finds correct points (expression == field)', function() {
                testFilter('v == 2', POINTS_NUMBERS, [{ v: 2 }]);
            });
        });

        describe('!=', function() {
            it('finds correct points (field != expression)', function() {
                testFilter('v != 2', POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });

            it('finds correct points (expression != field)', function() {
                testFilter('2 != v', POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });
        });

        describe('=~', function() {
            it('finds correct points (field =~ expression)', function() {
                testFilter('v =~ "e*h"', POINTS_STRINGS, [{ v: 'efgh' }]);
                testFilter('v =~ /e.*h/', POINTS_STRINGS, [{ v: 'efgh' }]);
            });
        });

        describe('!~', function() {
            it('finds correct points (field !~ expression)', function() {
                testFilter('v !~ "e*h"', POINTS_STRINGS, [{ v: 'abcd' }, { v: 'ijkl' }]);
                testFilter('v !~ /e.*h/', POINTS_STRINGS, [{ v: 'abcd' }, { v: 'ijkl' }]);
            });
        });

        describe('<', function() {
            it('finds correct points (field < expression)', function() {
                testFilter('v < 2', POINTS_NUMBERS, [{ v: 1 }]);
            });

            it('finds correct points (expression < field)', function() {
                testFilter('2 < v', POINTS_NUMBERS, [{ v: 3 }]);
            });
        });

        describe('>', function() {
            it('finds correct points (field > expression)', function() {
                testFilter('v > 2', POINTS_NUMBERS, [{ v: 3 }]);
            });

            it('finds correct points (expression > field)', function() {
                testFilter('2 > v', POINTS_NUMBERS, [{ v: 1 }]);
            });
        });

        describe('<=', function() {
            it('finds correct points (field <= expression)', function() {
                testFilter('v <= 2', POINTS_NUMBERS, [{ v: 1 }, { v: 2 }]);
            });

            it('finds correct points (expression <= field)', function() {
                testFilter('2 <= v', POINTS_NUMBERS, [{ v: 2 }, { v: 3 }]);
            });
        });

        describe('>=', function() {
            it('finds correct points (field >= expression)', function() {
                testFilter('v >= 2', POINTS_NUMBERS, [{ v: 2 }, { v: 3 }]
                );
            });

            it('finds correct points (expression >= field)', function() {
                testFilter('2 >= v', POINTS_NUMBERS, [{ v: 1 }, { v: 2 }]);
            });
        });

        describe('in', function() {
            it('finds correct points (field in expression)', function() {
                testFilter('v in [1, 3]', POINTS_NUMBERS, [{ v: 1 }, { v: 3 }]);
            });
        });
    });
});

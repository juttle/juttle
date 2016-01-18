var expect = require('chai').expect;

var FilterJSCompiler = require('../../../lib/compiler/filters/filter-js-compiler.js');
var JuttleMoment = require('../../../lib/moment').JuttleMoment;

// Needed to evaluate compiled Juttle code.
var juttle = require('../../../lib/runtime/runtime');   // eslint-disable-line

var POINTS_MISC = [
    { v: null                                         },
    { v: true                                         },
    { v: false                                        },
    { v: 5                                            },
    { v: Infinity                                     },
    { v: -Infinity                                    },
    { v: NaN                                          },
    { v: "abcd"                                       },
    { v: new JuttleMoment('2015-01-01T00:00:00.000Z') },
    { v: JuttleMoment.duration('00:00:05.000')        }
];

var POINTS_NUMBERS = [
    { v: 1 },
    { v: 2 },
    { v: 3 }
];

var POINTS_STRINGS = [
    { v: "abcd" },
    { v: "efgh" },
    { v: "ijkl" }
];

describe('FilterJSCompiler', function() {
    var fieldM = {
        type: 'UnaryExpression',
        operator: '*',
        expression: { type: 'StringLiteral', value: 'm' },
    };
    var fieldV = {
        type: 'UnaryExpression',
        operator: '*',
        expression: { type: 'StringLiteral', value: 'v' },
    };
    var literalNull = { type: 'NullLiteral' };
    var literalTrue = { type: 'BooleanLiteral', value: true };
    var literal1 = { type: 'NumericLiteral', value: 1 };
    var literal2 = { type: 'NumericLiteral', value: 2 };
    var literal3 = { type: 'NumericLiteral', value: 3 };
    var literal5 = { type: 'NumericLiteral', value: 5 };
    var literalInfinity = { type: 'InfinityLiteral', negative: false };
    var literalMinusInfinity = { type: 'InfinityLiteral', negative: true };
    var literalNaN = { type: 'NaNLiteral' };
    var literalAbcd = { type: 'StringLiteral', value: "abcd" };
    var literalGlob = { type: 'StringLiteral', value: "e*h" };
    var literalMoment = { type: 'MomentLiteral', value: '2015-01-01T00:00:00.000Z' };
    var literalDuration = { type: 'DurationLiteral', value: '00:00:05.000' };
    var literal13 = { type: 'ArrayLiteral', elements: [literal1, literal3] };
    var regExp = { type: 'RegularExpressionLiteral', value: "e.*h", flags: "" };

    function testFilter(ast, points, expected) {
        /* jshint evil:true */

        var compiler = new FilterJSCompiler();
        var fn = eval(compiler.compile(ast));

        expect(points.filter(fn)).to.deep.equal(expected);
    }

    describe('literals', function() {
        it('handles null', function() {
            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalNull
                    }
                },
                POINTS_MISC,
                [{ v: null }]
            );
        });

        it('handles booleans', function() {
            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalTrue
                    }
                },
                POINTS_MISC,
                [{ v: true }]
            );
        });

        it('handles numbers', function() {
            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literal5
                    }
                },
                POINTS_MISC,
                [{ v: 5 }]
            );

            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalInfinity
                    }
                },
                POINTS_MISC,
                [{ v: Infinity }]
            );

            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalMinusInfinity
                    }
                },
                POINTS_MISC,
                [{ v: -Infinity }]
            );

            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalNaN
                    }
                },
                POINTS_MISC,
                []   // no value equals NaN, not even NaN
            );
        });

        it('handles strings', function() {
            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalAbcd
                    }
                },
                POINTS_MISC,
                [{ v: "abcd" }]
            );
        });

        it('handles dates', function() {
            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalMoment
                    }
                },
                POINTS_MISC,
                [{ v: new JuttleMoment('2015-01-01T00:00:00.000Z') }]
            );
        });

        it('handles durations', function() {
            testFilter(
                {
                    type: 'ExpressionFilterTerm',
                    expression: {
                        type: 'BinaryExpression',
                        operator: '==',
                        left: fieldV,
                        right: literalDuration
                    }
                },
                POINTS_MISC,
                [{ v: JuttleMoment.duration('00:00:05.000') }]
            );
        });
    });

    describe('filter expressions', function() {
        describe('NOT', function() {
            it('finds correct points', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'UnaryExpression',
                            operator: 'NOT',
                            expression: {
                                type: 'BinaryExpression',
                                operator: '==',
                                left: fieldV,
                                right: literal2
                            }
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 3 }]
                );
            });
        });

        describe('AND', function() {
            it('finds correct points', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: 'AND',
                            left: {
                                type: 'BinaryExpression',
                                operator: '<=',
                                left: fieldV,
                                right: literal2
                            },
                            right: {
                                type: 'BinaryExpression',
                                operator: '>=',
                                left: fieldV,
                                right: literal2
                            }
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 2 }]
                );
            });
        });

        describe('OR', function() {
            it('finds correct points', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: 'OR',
                            left: {
                                type: 'BinaryExpression',
                                operator: '<=',
                                left: fieldV,
                                right: literal2
                            },
                            right: {
                                type: 'BinaryExpression',
                                operator: '>=',
                                left: fieldV,
                                right: literal2
                            }
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 2 }, { v: 3 }]
                );
            });
        });
    });

    describe('simple terms', function() {
        describe('with filter literals', function() {
            it('finds correct points', function() {
                testFilter(
                    {
                        type: 'SimpleFilterTerm',
                        expression: {
                            type: 'FilterLiteral',
                            ast: {
                                type: 'ExpressionFilterTerm',
                                expression: {
                                    type: 'BinaryExpression',
                                    operator: '==',
                                    left: fieldV,
                                    right: literal2
                                }
                            },
                            text: 'v == 2'
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 2 }]
                );
            });
        });
    });

    describe('expression terms', function() {
        describe('missing fields', function() {
            it('treats them as null', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '==',
                            left: fieldM,
                            right: literalNull
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 2 }, { v: 3 }]
                );
            });
        });

        describe('==', function() {
            it('finds correct points (field == expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '==',
                            left: fieldV,
                            right: literal2
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 2 }]
                );
            });

            it('finds correct points (expression == field)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '==',
                            left: literal2,
                            right: fieldV
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 2 }]
                );
            });
        });

        describe('!=', function() {
            it('finds correct points (field != expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '!=',
                            left: fieldV,
                            right: literal2
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 3 }]
                );
            });

            it('finds correct points (expression != field)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '!=',
                            left: literal2,
                            right: fieldV
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 3 }]
                );
            });
        });

        describe('=~', function() {
            it('finds correct points (field =~ expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '=~',
                            left: fieldV,
                            right: literalGlob
                        }
                    },
                    POINTS_STRINGS,
                    [{ v: "efgh" }]
                );

                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '=~',
                            left: fieldV,
                            right: regExp
                        }
                    },
                    POINTS_STRINGS,
                    [{ v: "efgh" }]
                );
            });
        });

        describe('!~', function() {
            it('finds correct points (field !~ expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '!~',
                            left: fieldV,
                            right: literalGlob
                        }
                    },
                    POINTS_STRINGS,
                    [{ v: "abcd" }, { v: "ijkl" }]
                );

                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '!~',
                            left: fieldV,
                            right: regExp
                        }
                    },
                    POINTS_STRINGS,
                    [{ v: "abcd" }, { v: "ijkl" }]
                );
            });
        });

        describe('<', function() {
            it('finds correct points (field < expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<',
                            left: fieldV,
                            right: literal2
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }]
                );
            });

            it('finds correct points (expression < field)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<',
                            left: literal2,
                            right: fieldV
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 3 }]
                );
            });
        });

        describe('>', function() {
            it('finds correct points (field > expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '>',
                            left: fieldV,
                            right: literal2
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 3 }]
                );
            });

            it('finds correct points (expression > field)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '>',
                            left: literal2,
                            right: fieldV
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }]
                );
            });
        });

        describe('<=', function() {
            it('finds correct points (field <= expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<=',
                            left: fieldV,
                            right: literal2
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 2 }]
                );
            });

            it('finds correct points (expression <= field)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '<=',
                            left: literal2,
                            right: fieldV
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 2 }, { v: 3 }]
                );
            });
        });

        describe('>=', function() {
            it('finds correct points (field >= expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '>=',
                            left: fieldV,
                            right: literal2
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 2 }, { v: 3 }]
                );
            });

            it('finds correct points (expression >= field)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: '>=',
                            left: literal2,
                            right: fieldV
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 2 }]
                );
            });
        });

        describe('in', function() {
            it('finds correct points (field in expression)', function() {
                testFilter(
                    {
                        type: 'ExpressionFilterTerm',
                        expression: {
                            type: 'BinaryExpression',
                            operator: 'in',
                            left: fieldV,
                            right: literal13
                        }
                    },
                    POINTS_NUMBERS,
                    [{ v: 1 }, { v: 3 }]
                );
            });
        });
    });
});

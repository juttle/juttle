'use strict';

var chai = require('chai');
var expect = chai.expect;

var Filter = require('../../../lib/runtime/types/filter');
var JuttleMoment = require('../../../lib/runtime/types/juttle-moment');
var _ = require('underscore');
var errors = require('../../../lib/errors');
var processFilter = require('./process-filter');

var FilterJSCompiler = require('../../../lib/compiler/filters/filter-js-compiler');

// Needed to evaluate compiled filters.
var juttle = require('../../../lib/runtime');   // eslint-disable-line

function filterPoints(filter, points) {
    var compiler = new FilterJSCompiler();
    var fn = eval(compiler.compile(processFilter(filter)));

    return _.filter(points, fn);
}

chai.use(function(chai, utils) {
    chai.Assertion.addMethod('filter', function(points, result) {
        var filtered = filterPoints(this._obj, points);

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

describe('FilterJSCompiler', function() {
    var FILTER_AST = {
        type: 'ExpressionFilterTerm',
        expression: {
            type: 'BinaryExpression',
            operator: '<',
            left: { type: 'Variable', name: 'a' },
            right: { type: 'NumberLiteral', value: 5 }
        }
    };

    var POINTS_VALUES = [
        { a: null },
        { a: true },
        { a: false },
        { a: 5 },
        { a: Infinity },
        { a: NaN },
        { a: 'abcd' },
        { a: /abcd/ },
        { a: /abcd/gim },
        { a: new JuttleMoment('2015-01-01T00:00:05.000Z') },
        { a: JuttleMoment.duration('00:00:05.000') },
        { a: new Filter(FILTER_AST, 'a < 5') },
        { a: [ 1, 2, 3 ] },
        { a: { a: 1, b: 2, c: 3 } }
    ];

    var POINTS_BOOLEANS = [
        { a: true },
        { a: false }
    ];

    var POINTS_NUMBERS = [
        { a: 1 },
        { a: 2 },
        { a: 3 }
    ];

    var POINTS_STRINGS = [
        { a: 'abcd' },
        { a: 'efgh' },
        { a: 'ijkl' }
    ];

    var POINTS_ARRAYS = [
        { a: [ 1, 2, 3 ] },
        { a: [ 4, 5, 6 ] },
        { a: [ 7, 8, 9 ] },
    ];

    var POINTS_OBJECTS = [
        { a: { 'a': 1 } },
        { a: { 5: 2 } },
        { a: { 'abcd': 3 } },
    ];

    it('compiles NullLiteral correctly', function() {
        expect('a == null').to.filter(POINTS_VALUES, [ { a: null } ]);
    });

    it('compiles BooleanLiteral correctly', function() {
        expect('a == true').to.filter(POINTS_VALUES, [ { a: true } ]);
        expect('a == false').to.filter(POINTS_VALUES, [ { a: false } ]);
    });

    it('compiles NumberLiteral correctly', function() {
        expect('a == 5').to.filter(POINTS_VALUES, [ { a: 5 } ]);
    });

    it('compiles InfinityLiteral correctly', function() {
        expect('a == Infinity').to.filter(POINTS_VALUES, [ { a: Infinity } ]);

        // Negative InfinityLiteral can't be tested because "-Infinity" is
        // parsed as a unary operator and a positive InfinityLiteral.
    });

    it('compiles NaNLiteral correctly', function() {
        // No value equals NaN, not even NaN.
        expect('a == NaN').to.filter(POINTS_VALUES, []);
    });

    it('compiles StringLiteral correctly', function() {
        expect('a == "abcd"').to.filter(POINTS_VALUES, [ { a: 'abcd' } ]);
    });

    it('compiles MultipartStringLiteral correctly', function() {
        expect('a == "${"ab" + "cd"}"').to.filter(POINTS_VALUES, [ { a: 'abcd' } ]);
    });

    it('compiles RegExpLiteral correctly', function() {
        expect('a == /abcd/').to.filter(POINTS_VALUES, [ { a: /abcd/ } ]);
        expect('a == /abcd/gim').to.filter(POINTS_VALUES, [ { a: /abcd/gim } ]);
    });

    it('compiles MomentLiteral correctly', function() {
        expect('a == :2015-01-01T00:00:05.000Z:').to.filter(
            POINTS_VALUES,
            [ { a: new JuttleMoment('2015-01-01T00:00:05.000Z') } ]
        );
    });

    it('compiles DurationLiteral correctly', function() {
        expect('a == :00:00:05.000:').to.filter(
            POINTS_VALUES,
            [ { a: JuttleMoment.duration('00:00:05.000') } ]
        );
    });

    // FilterLiteral can't be tested because there is no filter literal syntax.

    it('compiles ArrayLiteral correctly', function() {
        expect('a == [ 1, 2, 3 ]').to.filter(POINTS_VALUES, [ { a: [ 1, 2, 3 ] } ]);
    });

    it('compiles ObjectLiteral correctly', function() {
        expect('a == { a: 1 }').to.filter(POINTS_OBJECTS, [ { a: { a: 1 } } ]);
        expect('a == { 5: 2 }').to.filter(POINTS_OBJECTS, [ { a: { 5: 2 } } ]);
        expect('a == { "${"ab" + "cd"}": 3 }').to.filter(POINTS_OBJECTS, [ { a: { 'abcd': 3 } } ]);
    });

    it('compiles ObjectProperty correctly', function() {
        expect('a == { a: 1 }').to.filter(POINTS_OBJECTS, [ { a: { a: 1 } } ]);
        expect('a == { "${"ab" + "cd"}": 3 }').to.filter(POINTS_OBJECTS, [ { a: { 'abcd': 3 } } ]);
    });

    it('compiles Field correctly', function() {
        expect('#a == 2').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
    });

    it('compiles ToString correctly', function() {
        expect('a == "${"ab" + "cd"}"').to.filter(POINTS_VALUES, [ { a: 'abcd' } ]);
    });

    it('compiles MemberExpression correctly', function() {
        // Non-computed MemberExpression can't be tested because it refers to
        // module exports and we can't load modules here.

        expect('a[1] == 5').to.filter(POINTS_ARRAYS, [ { a: [ 4, 5, 6 ] } ]);
    });

    // CallExpression can't be tested because it calls a function and we can't
    // define functions here.

    it('compiles UnaryExpression correctly', function() {
        expect('*"a" == 2').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == !false').to.filter(POINTS_BOOLEANS, [ { a: true } ]);
        expect('a == +2').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == -(-2)').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == ~(-3)').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('NOT a == 2').to.filter(POINTS_NUMBERS, [ { a: 1 }, { a: 3 } ]);
    });

    it('compiles BinaryExpression correctly', function() {
        expect('a == (true && true)').to.filter(POINTS_BOOLEANS, [ { a: true } ]);
        expect('a == (true || true)').to.filter(POINTS_BOOLEANS, [ { a: true } ]);
        expect('a == 1 + 1').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 3 - 1').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 2 * 1').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 4 / 2').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 2 % 3').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == (2 & 2)').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == (2 | 2)').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == (2 ^ 0)').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 1 << 1').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 4 >> 1').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 4 >>> 1').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a == 2').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a != 2').to.filter(POINTS_NUMBERS, [ { a: 1 }, { a: 3 } ]);
        expect('a =~ "efgh"').to.filter(POINTS_STRINGS, [ { a: 'efgh' } ]);
        expect('a !~ "efgh"').to.filter(POINTS_STRINGS, [ { a: 'abcd' }, { a: 'ijkl' } ]);
        expect('a < 2').to.filter(POINTS_NUMBERS, [ { a: 1 } ]);
        expect('a > 2').to.filter(POINTS_NUMBERS, [ { a: 3 } ]);
        expect('a <= 2').to.filter(POINTS_NUMBERS, [ { a: 1 }, { a : 2 } ]);
        expect('a >= 2').to.filter(POINTS_NUMBERS, [ { a: 2 }, { a : 3 } ]);
        expect('a in [ 1, 3 ]').to.filter(POINTS_NUMBERS, [ { a: 1 }, { a : 3 } ]);
        expect('a <= 2 AND a >= 2').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
        expect('a <= 2 OR a >= 2').to.filter(POINTS_NUMBERS, [ { a: 1 }, { a: 2 }, { a: 3 } ]);
        expect('a == (null ?? 2)').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
    });

    it('compiles ConditionalExpression correctly', function() {
        expect('a == (true ? 2 : 3)').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
    });

    it('compiles ExpressionFilterTerm correctly', function() {
        expect('a == 2').to.filter(POINTS_NUMBERS, [ { a: 2 } ]);
    });

    it('compiles SimpleFilterTerm correctly', function() {
        expect(function() {
            filterPoints('"abcd"', POINTS_STRINGS);
        }).to.throw(errors.CompileError);

        // FilterLiteral can't be tested because there is no filter literal
        // syntax.
    });
});

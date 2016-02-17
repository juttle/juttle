'use strict';

let chai = require('chai');
let expect = chai.expect;

let errors = require('../../../lib/errors');
let processFilter = require('./process-filter');

let StaticFilterCompiler = require('../../../lib/compiler/filters/static-filter-compiler');


// A compiler which doesn't implement any method.
class EmptyCompiler extends StaticFilterCompiler {
}

// A compiler which compiles only NumberLiterals inside BinaryExpressions.
class NumberLiteralCompiler extends StaticFilterCompiler {
    visitNumberLiteral() {
    }

    visitBinaryExpression(node) {
        this.compile(node.left);
        this.compile(node.right);
    }
}

// A compiler which compiles only Fields inside BinaryExpressions.
class FieldCompiler extends StaticFilterCompiler {
    visitField() {
    }

    visitBinaryExpression(node) {
        this.compile(node.left);
        this.compile(node.right);
    }
}

chai.use((chai, utils) => {
    let Assertion = chai.Assertion;

    // In method definitions, function expressions need to be used instead of
    // arrow functions, otherwise "this" will have a wrong value inside defined
    // methods.

    Assertion.addMethod('failToCompile', function(compilerClass, message) {
        let compiler = new compilerClass();

        new Assertion(() => {
            compiler.compile(processFilter(this._obj));
        }).to.throw(errors.CompileError, message);
    });
});

describe('StaticFilterCompiler', () => {
    it('doesn\'t compile NullLiteral', () => {
        expect('a < null').to.failToCompile(
            FieldCompiler,
            'Filters do not support null in this context.'
        );
    });

    it('doesn\'t compile BooleanLiteral', () => {
        expect('a < true').to.failToCompile(
            FieldCompiler,
            'Filters do not support booleans in this context.'
        );
    });

    it('doesn\'t compile NumberLiteral', () => {
        expect('a < 5').to.failToCompile(
            FieldCompiler,
            'Filters do not support numbers in this context.'
        );
    });

    it('doesn\'t compile InfinityLiteral', () => {
        expect('a < Infinity').to.failToCompile(
            FieldCompiler,
            'Filters do not support Infinity in this context.'
        );
    });

    it('doesn\'t compile NaNLiteral', () => {
        expect('a < NaN').to.failToCompile(
            FieldCompiler,
            'Filters do not support NaN in this context.'
        );
    });

    it('doesn\'t compile StringLiteral', () => {
        expect('a < "abcd"').to.failToCompile(
            FieldCompiler,
            'Filters do not support strings in this context.'
        );
    });

    it('doesn\'t compile RegExpLiteral', () => {
        expect('a < /abcd/').to.failToCompile(
            FieldCompiler,
            'Filters do not support regular expressions in this context.'
        );
    });

    it('doesn\'t compile MomentLiteral', () => {
        expect('a < :2015-01-01T00:00:05.000Z:').to.failToCompile(
            FieldCompiler,
            'Filters do not support moments in this context.'
        );
    });

    it('doesn\'t compile DurationLiteral', () => {
        expect('a < :00:00:05.000:').to.failToCompile(
            FieldCompiler,
            'Filters do not support durations in this context.'
        );
    });

    it('doesn\'t compile ArrayLiteral', () => {
        expect('a < [ 1, 2, 3 ]').to.failToCompile(
            FieldCompiler,
            'Filters do not support arrays in this context.'
        );
    });

    it('doesn\'t compile ObjectLiteral', () => {
        expect('a < { a: 1, b: 2, c: 3 }').to.failToCompile(
            FieldCompiler,
            'Filters do not support objects in this context.'
        );
    });

    it('doesn\'t compile Field', () => {
        expect('a < 5').to.failToCompile(
            NumberLiteralCompiler,
            'Filters do not support fields in this context.'
        );
    });

    it('doesn\'t compile UnaryExpression', () => {
        expect('NOT a < 5').to.failToCompile(
            EmptyCompiler,
            'Filters do not support the "NOT" operator in this context.'
        );
    });

    it('doesn\'t compile BinaryExpression', () => {
        expect('a < 5 AND b > 6').to.failToCompile(
            EmptyCompiler,
            'Filters do not support the "AND" operator in this context.'
        );
    });

    it('doesn\'t compile FulltextFilterTerm', () => {
        expect('"abcd"').to.failToCompile(
            EmptyCompiler,
            'Filters do not support fulltext search in this context.'
        );
    });
});

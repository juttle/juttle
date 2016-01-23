'use strict';

var expect = require('chai').expect;

var parser = require('../../lib/parser');
var StaticInputDetector = require('../../lib/compiler/static-input-detector');

describe('StaticInputDetector', function() {
    var detector = new StaticInputDetector();

    it('considers inputs whose options refer only to literals static', function() {
        var ast = parser.parseSync('input i: text -label "I";');
        var node = ast.elements[0];

        expect(detector.isStatic(node)).to.equal(true);
    });

    it('considers inputs whose options refer to consts as non-static', function() {
        var ast = parser.parseSync([
            'const c = "I";',
            '',
            'input i: text -label c;'
        ].join('\n'));
        var node = ast.elements[1];

        expect(detector.isStatic(node)).to.equal(false);
    });

    it('considers inputs whose options refer to functions as non-static', function() {
        var ast = parser.parseSync([
            'function f() {',
            '    return "I";',
            '}',
            '',
            'input i: text -label f();'
        ].join('\n'));
        var node = ast.elements[1];

        expect(detector.isStatic(node)).to.equal(false);
    });
});

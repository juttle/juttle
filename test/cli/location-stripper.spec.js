'use strict';

var expect = require('chai').expect;
var parser = require('../../lib/parser');

var LocationStripper = require('../../lib/cli/location-stripper');

describe('LocationStripper', function() {
    describe('strip', function() {
        it('strips location info from all nodes', function() {
            var ast = parser.parseSync('emit -limit 5');
            var stripper = new LocationStripper();

            stripper.strip(ast);

            // MainModuleDef
            expect(ast).not.to.have.property('location');
            // SequentialGraph
            expect(ast.elements[0]).not.to.have.property('location');
            // OptionOnlyProc(name = "emit")
            expect(ast.elements[0].elements[0]).not.to.have.property('location');
            // ProcOption(id = "limit")
            expect(ast.elements[0].elements[0].options[0]).not.to.have.property('location');
            // NumericLiteral(value = 5)
            expect(ast.elements[0].elements[0].options[0].expr).not.to.have.property('location');
        });
    });
});

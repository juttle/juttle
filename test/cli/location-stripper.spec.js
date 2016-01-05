var expect = require('chai').expect;
var compiler = require('../../lib/compiler');

var locationStripper = require('../../lib/cli/location-stripper');

describe('LocationStripper', function() {
    describe('strip', function() {
        it('strips location info from all ast nodes', function() {
            var ast = compiler.compileSync('emit -limit 5', {stage: 'parse'});

            // MainModuleDef
            expect(ast).to.have.property('location');
            // SequentialGraph
            expect(ast.elements[0]).to.have.property('location');
            // OptionOnlyProc(name = "emit")
            expect(ast.elements[0].elements[0]).to.have.property('location');
            // ProcOption(id = "limit")
            expect(ast.elements[0].elements[0].options[0]).to.have.property('location');
            // NumericLiteral(value = 5)
            expect(ast.elements[0].elements[0].options[0].expr).to.have.property('location');

            locationStripper(ast);

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

        it('strips location info from all flowgraph nodes', function() {
            var graph = compiler.compileSync('emit -limit 5 | view table', {stage: 'flowgraph'});

            expect(graph.built_graph.nodes[0]).to.have.property('location');
            expect(graph.built_graph.nodes[1]).to.have.property('location');

            locationStripper(graph);

            expect(graph.built_graph.nodes[0]).to.not.have.property('location');
            expect(graph.built_graph.nodes[1]).to.not.have.property('location');
        });
    });
});

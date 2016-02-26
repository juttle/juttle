'use strict';

var _ = require('underscore');
var expect = require('chai').expect;
var Promise = require('bluebird');
var compiler = require('../../lib/compiler');

var operations = {
    compileSync: function(code, options) {
        return Promise.try(function() {
            return compiler.compileSync(code, options);
        });
    },

    compile: function(code, options) {
        return Promise.try(function() {
            return compiler.compile(code, options);
        });
    }
};

_.each(operations, function(compile, mode) {
    describe(`LocationStripper ${mode}`, function() {
        it('does not strip location info from parse output by default', function() {
            return compile('emit -limit 5', { stage: 'parse' })
            .then(function(ast) {
                // MainModuleDef
                expect(ast).to.have.property('location');
                // SequentialGraph
                expect(ast.elements[0]).to.have.property('location');
                // OptionOnlyProc(name = "emit")
                expect(ast.elements[0].elements[0]).to.have.property('location');
                // ProcOption(id = "limit")
                expect(ast.elements[0].elements[0].options[0]).to.have.property('location');
                // NumberLiteral(value = 5)
                expect(ast.elements[0].elements[0].options[0].expr).to.have.property('location');
            });
        });

        it('strips location info from parse output', function() {
            return compile('emit -limit 5', { stage: 'parse', stripLocations: true })
            .then(function(ast) {
                // MainModuleDef
                expect(ast).not.to.have.property('location');
                // SequentialGraph
                expect(ast.elements[0]).not.to.have.property('location');
                // OptionOnlyProc(name = "emit")
                expect(ast.elements[0].elements[0]).not.to.have.property('location');
                // ProcOption(id = "limit")
                expect(ast.elements[0].elements[0].options[0]).not.to.have.property('location');
                // NumberLiteral(value = 5)
                expect(ast.elements[0].elements[0].options[0].expr).not.to.have.property('location');
            });
        });

        it('strips location info from semantic output', function() {
            return compile('emit -limit 5', { stage: 'semantic', stripLocations: true })
            .then(function(ast) {
                // MainModuleDef
                expect(ast).not.to.have.property('location');
                // SequentialGraph
                expect(ast.elements[0]).not.to.have.property('location');
                // OptionOnlyProc(name = "emit")
                expect(ast.elements[0].elements[0]).not.to.have.property('location');
                // ProcOption(id = "limit")
                expect(ast.elements[0].elements[0].options[0]).not.to.have.property('location');
                // NumberLiteral(value = 5)
                expect(ast.elements[0].elements[0].options[0].expr).not.to.have.property('location');
            });
        });

        it('does not strip location info from flowgraph output by default', function() {
            return compile('emit -limit 5', { stage: 'flowgraph' })
            .then(function(graph) {
                expect(graph.built_graph.nodes[0].location).is.an.object;
            });
        });

        it('strips location info from flowgraph output', function() {
            return compile('emit -limit 5', { stage: 'flowgraph', stripLocations: true })
            .then(function(graph) {
                expect(graph.built_graph.nodes[0].location).is.undefined;
            });
        });

        it('does not strip location info from compiler output by default', function() {
            return compile('emit -limit 5 | view table', { stage: 'compile' })
            .then(function(code) {
                expect(code).not.to.contain('location: undefined');
            });
        });

        it('strips location info from compiler output', function() {
            return compile('emit -limit 5 | view table', { stage: 'compile', stripLocations: true })
            .then(function(code) {
                expect(code).to.contain('location: undefined');
            });
        });
    });
});

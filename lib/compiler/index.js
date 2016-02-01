'use strict';

/* jshint evil:true */

var events = require('backbone').Events;
var Scheduler = require('../runtime/scheduler').Scheduler;
var Graph = require('../graph');
var Program = require('../program');

var parser = require('../parser');
var SemanticPass = require('./semantic');
var GraphBuilder = require('./graph-builder').GraphBuilder;
var GraphCompiler = require('./graph-compiler');
var Build = require('./build');

var _ = require('underscore'); // jshint ignore:line
var JuttleMoment = require('../moment').JuttleMoment;
var juttle = require('../runtime').runtime;

var Juttle = require('../runtime').Juttle;

var stages = {
    semantic: function(ast, options) {
        var s = new SemanticPass(options);
        return s.analyze(JSON.parse(JSON.stringify(ast)));
    },

    build: function(ast) {
        var builder = new Build();
        return builder.gen(ast);
    },

    flowgraph: function(code, options) {
        var fn = eval(code);
        var gb = new GraphBuilder(options);
        fn(gb, juttle);
        var graph = gb.graph();
        var program = new Graph();
        program.built_graph = graph;
        _.each(options.fg_processors, function(processor) {
            processor(program, Juttle);
        });
        return program;
    },

    compile: function(graph, options) {
        var compiler = new GraphCompiler();
        return compiler.gen(graph.built_graph);
    },

    eval: function(code, options) {
        var program = new Program();
        program.scheduler = options.scheduler;
        program.events = _.extend({}, events);
        program.code = code;

        program._eval();
        program._validate_sinks();
        program._validate_sources();

        return program;
    }
};

var stageNames = _.keys(stages);

function stagesUpTo(stageName) {
    var index = _.indexOf(stageNames, stageName);

    return _.map(stageNames.slice(0, index + 1), function(name) {
        return stages[name];
    });
}

function compile(juttle, options) {
    if (options === undefined) {
        options = {};
    }

    var now = new JuttleMoment();

    var parserOptions = _.pick(options, 'filename', 'modules', 'moduleResolver');
    parserOptions.now = now;

    var compilerOptions = _.defaults(_.clone(options), {
        stage: 'eval',
        now: now,
        inputs: {},
        input_defaults: {},
        fg_processors: [],
        scheduler: new Scheduler()
    });

    var promise = parser.parse(juttle, parserOptions);
    return _.reduce(stagesUpTo(compilerOptions.stage), function(acc, stage) {
        return acc.then(function(input) {
            return stage(input, compilerOptions);
        });
    }, promise);
}

function compileSync(juttle, options) {
    if (options === undefined) {
        options = {};
    }

    var now = new JuttleMoment();

    var parserOptions = _.pick(options, 'filename', 'modules', 'moduleResolver');
    parserOptions.now = now;

    var compilerOptions = _.defaults(_.clone(options), {
        stage: 'eval',
        now: now,
        inputs: {},
        input_defaults: {},
        fg_processors: [],
        scheduler: new Scheduler()
    });

    var ast = parser.parseSync(juttle, parserOptions);
    return _.reduce(stagesUpTo(compilerOptions.stage), function(acc, stage) {
        return stage(acc, compilerOptions);
    }, ast);
}

module.exports = {
    compile: compile,
    compileSync: compileSync,
    stageNames: ['parse'].concat(stageNames)
};

'use strict';

var Scheduler = require('../runtime/scheduler').Scheduler;
var Graph = require('../graph');
var Program = require('../program');

var parser = require('../parser');
var SemanticPass = require('./semantic');
var GraphBuilder = require('./graph-builder').GraphBuilder;
var GraphCompiler = require('./graph-compiler');
var locationStripper = require('./location-stripper');
var Build = require('./build');

var _ = require('underscore');
var JuttleMoment = require('../runtime/types/juttle-moment');
var juttle = require('../runtime').runtime;

var optimize = require('./optimize');
var implicit_views = require('./flowgraph/implicit_views');
var check_runaway = require('./flowgraph/check_runaway');
var views_sourceinfo = require('./flowgraph/views_sourceinfo');

var DEFAULT_PROCESSORS = [implicit_views, check_runaway, views_sourceinfo, optimize];

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
            processor(program, options);
        });
        return program;
    },

    compile: function(graph, options) {
        var compiler = new GraphCompiler();
        return compiler.gen(graph.built_graph);
    },

    eval: function(code, options) {
        var program = new Program(code, options);

        program.eval();
        program.validate();

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
        implicit_view: 'table',
        fg_processors: DEFAULT_PROCESSORS,
        stripLocations: false,
        scheduler: new Scheduler()
    });

    var promise = parser.parse(juttle, parserOptions);

    if (compilerOptions.stripLocations) {
        promise = promise.then(function(ast) {
            return locationStripper(ast);
        });
    }

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
        implicit_view: 'table',
        fg_processors: DEFAULT_PROCESSORS,
        stripLocations: false,
        scheduler: new Scheduler()
    });

    var ast = parser.parseSync(juttle, parserOptions);

    if (compilerOptions.stripLocations) {
        ast = locationStripper(ast);
    }

    return _.reduce(stagesUpTo(compilerOptions.stage), function(acc, stage) {
        return stage(acc, compilerOptions);
    }, ast);
}

module.exports = {
    compile: compile,
    compileSync: compileSync,
    stageNames: ['parse'].concat(stageNames)
};

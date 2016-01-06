/* jshint: node */

var fs = require('fs');
var path = require('path');
var events = require('events');
var _ = require('underscore');
var Promise = require('bluebird');
var expect = require('chai').expect;
var log4js = require('log4js');
var JuttleLogger = require('../../../lib/logger');
var utils = require('../../../lib/runtime').utils;
var Juttle = require('../../../lib/runtime/index').Juttle;
var JuttleMoment = require('../../../lib/moment').JuttleMoment;
var compiler = require('../../../lib/compiler');
var parser = require('../../../lib/parser');
var TestScheduler = require('../../../lib/runtime/scheduler').TestScheduler;
var url = require('url');
var implicit_views = require('../../../lib/compiler/flowgraph/implicit_views')();
var optimize = require('../../../lib/compiler/optimize');

// Set up logging to use log4js loggers
JuttleLogger.getLogger = log4js.getLogger;

// Register the test adapter
var adapter = require('../test-adapter');

Juttle.adapters.register('test', adapter({}, Juttle));

if (! process.env.DEBUG) {
    log4js.setGlobalLogLevel('info');
}

var logger = JuttleLogger.getLogger('juttle-tests');
logger.debug('initializing');

// silence the deprecation warnings from this:
//      https://github.com/moment/moment/issues/1407
// which are really only being triggered when we're doing negative testing
var moment = require('moment');
moment.createFromInputFallback = function(config) {
    // unreliable string magic, or
    config._d = new Date(config._i);
};

// a bunch of tests are expecting to get epochms from Juttle,
// but now we only return ISO strings. This utility converts
// them back into epochms for the relevant tests.
function get_times(pts) {
    _.each(utils.toNative(pts), function(pt) {
        if (pt.time instanceof JuttleMoment) {
            pt.time = pt.time.valueOf();
        }
    });

    return pts;
}

(function() {
    var FileAdapter = require('../../../lib/adapters/file')();
    _(FileAdapter.read.prototype).extend({
        fetch: function() {
            var filepath = path.resolve(__dirname, this.filename);
            return fs.createReadStream(filepath, { encoding: 'utf8' });
        }
    });
})();

var stdin = process.stdin;
var stdout = process.stdout;

function set_stdin(stream) {
    stdin = stream;
}

function set_stdout(stream) {
    stdout = stream;
}

// allow for easy injection of input stream for the `read stdin` adapter
// at test time
(function() {
    var stdio = require('../../../lib/adapters/stdio')();
    _(stdio.read.prototype).extend({
        getStdin: function() {
            return stdin;
        }
    });
    _(stdio.write.prototype).extend({
        getStdout: function() {
            return stdout;
        }
    });
})();


var TestView = Juttle.proc.subscribe.extend({
    initialize: function(options) {
        this.sink = options.sink;
        this.eofs = options.eofs || 1;
        this.data = [];
        this.ticks = options.sink.options && options.sink.options.ticks;
        this.marks = options.sink.options && options.sink.options.marks;
        this.times = options.sink.options && options.sink.options.times;
    },
    procName: 'testsink',
    emitEvent: events.EventEmitter.prototype.emit,
    on: events.EventEmitter.prototype.on,
    consume: function(data) {
        this.data = this.data.concat(utils.fromNative(data.map(_.clone)));
    },
    mark: function(time) {
        if (this.marks && this.times) {
            this.data = this.data.concat(utils.fromNative([{time:time, mark:true}]));
        } else if (this.marks) {
            this.data = this.data.concat({mark:true});
        }
    },
    tick: function(time) {
        if (this.ticks && this.times) {
            this.data = this.data.concat(utils.fromNative([{time:time, tick:true}]));
        } else if (this.ticks) {
            this.data = this.data.concat({tick:true});
        }
    },
    eof: function() {
        if (--this.eofs === 0) {
            var result = {};
            result.data = utils.fromNative(this.data);
            result.name = this.sink.name;

            result.type = this.sink.name;
            result.options = this.sink.options;
            logger.debug('End of file reached: emitting', result);
            this.emitEvent('end', result);
        }
    }
});

function compile_juttle(options) {
    logger.debug('parsing Juttle program:', options.program);
    if (options.hasOwnProperty('modules') && options.hasOwnProperty('moduleResolver')) {
        throw new Error("confused by presence of both 'modules' and 'moduleResolver'");
    }
    var source = options.program;
    options = _.omit(options, 'program');

    var compile_opts = {
        modules: options.modules,
        moduleResolver: options.moduleResolver,
        fg_processors: [implicit_views, optimize],
        scheduler: new TestScheduler()
    };

    if (_.has(options, 'inputs')) {
        var flowgraph = compiler.compileSync(source, {
            modules: options.modules,
            moduleResolver: options.moduleResolver,
            stage: 'flowgraph'
        }).built_graph;
        var bnames_build = _.map(flowgraph.inputs, function(input) { return input.id; });
        var bnames_test = _.keys(options.inputs);

        // all test-supplied bnames are valid build-computed bnames
        expect(_.union(bnames_build, bnames_test).length).to.equal(bnames_build.length);

        compile_opts.inputs = options.inputs;
    }

    if (_.has(options, 'input_defaults')) {
        compile_opts.input_defaults = options.input_defaults;
    }

    return compiler.compile(source, compile_opts);
}


function check_juttle(options, deactivateAfter) {
    /*
     * deactivateAfter: number of milliseconds to wait before deactivating the
     *                  program allowing for live/long running program testing
     */
    return compile_juttle(options)
    .then(function(prog) {
        var done = run_juttle(prog, options);

        if (deactivateAfter) {
            return Promise
            .delay(null, deactivateAfter)
            .then(function() {
                prog.deactivate();
                return done;
            });
        } else {
            return done;
        }
    });
}

function run_juttle(prog, options) {
    options = options || {};
    // make sure paths relative to the location of this file work:
    if (options.expect_file) {
        options.expect_file = path.resolve(__dirname, options.expect_file);
    }

    var expect_data = options.expect_data;
    var raw_data;
    var sink_options = {};

    if (options.sink_options) {
        sink_options = options.sink_options;
    }

    var sink_handlers = [];

    if (options.expect_file && ! options.write_expect_file) {
        raw_data = fs.readFileSync(options.expect_file, 'utf8');
        expect_data = JSON.parse(raw_data);
    }

    return Promise.try(function() {
        logger.debug('binding Juttle sinks');
        var promises = _.map(prog.get_sinks(), function(sink) {

            // non-visual sinks don't implement pub/sub channel but instead have
            // a done() promise to indicate when they are at eof.
            if (sink.procName !== 'view') {
                return sink.isDone
                .then(function() {
                    return sink;
                });
            }

            var cur_options = _.extend({ sink: sink }, sink_options[sink.name]);
            var sink_handler = new TestView(cur_options, {}, null, null, prog);

            sink_handlers.push(sink_handler);

            prog.bind_sink(sink_handler, sink.channel);

            return new Promise(function(resolve, reject) {
                sink_handler.on('end', resolve);
                sink_handler.on('error', reject);
            });
        });

        var errors = [];
        var warnings = [];

        prog.events.on('error', function(err) {
            errors.push(err);
        });

        prog.events.on('warning', function(warn) {
            warnings.push(warn);
        });

        logger.debug('activating Juttle program');
        prog.activate();

        return Promise.all(promises).spread(function() {
            var all_sinks = {};
            _.each(arguments, function(sink) {
                // XXX should this be fatal?
                if (_.has(all_sinks, sink.name)) {
                    logger.error('Duplicate sink name:', sink.name);
                }
                all_sinks[sink.name] = sink.data;
            });

            if (options.write_expect_file) {
                fs.writeFileSync(options.expect_file, JSON.stringify(all_sinks, null, '  '));
            }
            else if (expect_data) {
                expect(all_sinks).to.deep.equal(expect_data);
            }
            return {sinks: all_sinks, prog:prog, errors: errors, warnings: warnings};
        });
    });
}


function wait_for_event(program, type, checker) {
    return new Promise(function(resolve, reject) {
        program.on(type, resolve);
    })
    .then(function(err) {
        checker(err);
    });
}

function module_resolver(modules) {
    return function(name) {
        var filename = __dirname + '/../../../lib/stdlib/' + name;
        if (fs.existsSync(filename)) {
            return Promise.resolve({ name: name, source: fs.readFileSync(filename, 'utf8') });
        }

        var module = modules[name];
        if (module) {
            return Promise.resolve({ name: name, source: module });
        }

        throw new Error('Unknown module: ' + name);
    };
}

module.exports = {
    wait_for_event: wait_for_event,
    get_times: get_times,
    compile_juttle: compile_juttle,
    check_juttle: check_juttle,
    run_juttle: run_juttle,
    module_resolver: module_resolver,
    set_stdin: set_stdin,
    set_stdout: set_stdout
};

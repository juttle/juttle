'use strict';

// Make sure to call log-setup before requiring any other sources to make sure
// that the configuration applies to any loggers initialized in module scope.
require('../../../lib/cli/log-setup')();

var fs = require('fs');
var util = require('util');
var path = require('path');
var _ = require('underscore');
var Promise = require('bluebird');
var expect = require('chai').expect;
var JuttleLogger = require('../../../lib/logger');
var utils = require('../../../lib/runtime').utils;
var adapters = require('../../../lib/runtime/adapters');
var adapterAPI = require('../../../lib/adapters/api');
var JuttleMoment = require('../../../lib/runtime/types/juttle-moment');
var compiler = require('../../../lib/compiler');
var Scheduler = require('../../../lib/runtime/scheduler').Scheduler;
var TestScheduler = require('../../../lib/runtime/scheduler').TestScheduler;
var View = require('../../../lib/views/view.js');
var FileResolver = require('../../../lib/module-resolvers/file-resolver');
var resolver_utils = require('../../../lib/module-resolvers/resolver-utils');

// Configure the test adapter
adapters.configure({
    test: {
        path: path.resolve(__dirname, '../test-adapter')
    },
    testTimeseries: {
        path: path.resolve(__dirname, '../test-adapter-timeseries')
    }
});


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


class TestView extends View {
    constructor(options, env) {
        super(options, env);
        this.name = 'test';
        this.sink = options.sink;
        this.eofs = options.eofs || 1;
        this.data = [];
        this.ticks = options.sink.options && options.sink.options.ticks;
        this.marks = options.sink.options && options.sink.options.marks;
        this.times = options.sink.options && options.sink.options.times;
        this.dt = options.sink.options && options.sink.options.dt;
        this.env = env;
    }
    consume(data) {
        this.data = this.data.concat(utils.fromNative(data.map(_.clone)));
    }
    mark(mark) {
        if (this.marks && this.times) {
            this.data = this.data.concat(utils.fromNative([{time:mark.time, mark:true}]));
        } else if (this.marks) {
            this.data = this.data.concat({mark:true});
        }
    }
    tick(time) {
        if (this.ticks) {
            if (this.times) {
                this.data = this.data.concat(utils.fromNative([{time:time, tick:true}]));
            } else if (this.dt) {
                this.data = this.data.concat(utils.fromNative([{dt:JuttleMoment.subtract(time, this.env.now), tick:true}]));
            } else {
                this.data = this.data.concat({tick:true});
            }
        }
    }
    eof() {
        if (--this.eofs === 0) {
            var result = {};
            result.data = utils.fromNative(this.data);
            result.name = this.sink.name;

            result.type = this.sink.name;
            result.options = this.sink.options;
            logger.debug('End of file reached: emitting', result);
            this.events.emit('end', result);
        }
    }
}

function compile_juttle(options) {
    logger.debug('parsing Juttle program:', options.program);
    if (options.hasOwnProperty('modules') && options.hasOwnProperty('moduleResolver')) {
        throw new Error('confused by presence of both \'modules\' and \'moduleResolver\'');
    }
    var source = options.program;
    options = _.omit(options, 'program');

    var compile_opts = {
        modules: options.modules,
        moduleResolver: options.moduleResolver,
        scheduler: options.realtime ? new Scheduler() : new TestScheduler()
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


function check_juttle(options) {
    return compile_juttle(options)
    .then(function(prog) {
        return run_juttle(prog, options);
    });
}

function run_juttle(prog, options) {
    options = options || {};
    var graph = prog.graph;
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

    if (options.expect_file && ! options.write_expect_file) {
        raw_data = fs.readFileSync(options.expect_file, 'utf8');
        expect_data = JSON.parse(raw_data);
    }

    var done = Promise.try(function() {
        var views = {};

        var promises = _.map(prog.get_sinks(), function(sink) {
            // non-visual sinks don't implement pub/sub channel but instead have
            // a done() promise to indicate when they are at eof.
            if (sink.procName() !== 'view') {
                return sink.isDone
                    .then(function() {
                        return sink;
                    });
            } else {
                var view = new TestView(_.extend({ sink: sink }, sink_options[sink.name]), prog.env);
                views[sink.channel] = view;

                return new Promise(function(resolve, reject) {
                    view.events.on('end', resolve);
                    view.events.on('error', reject);
                });
            }
        });

        var errors = [];
        var warnings = [];

        // Dispatch to correct test view
        prog.events.on('view:mark', function(event) {
            views[event.channel].mark(event.data);
        });

        prog.events.on('view:tick', function(event) {
            views[event.channel].tick(event.data);
        });

        prog.events.on('view:eof', function(event) {
            views[event.channel].eof();
        });

        prog.events.on('view:points', function(event) {
            views[event.channel].consume(event.data);
        });

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
            return {sinks: all_sinks, prog:prog, graph: graph, errors: errors, warnings: warnings};
        });
    });

    /*
     * deactivateAfter: number of milliseconds to wait before deactivating the
     *                  program allowing for live/long running program testing
     */
    if (options.deactivateAfter) {
        return Promise
        .delay(options.deactivateAfter)
        .then(function() {
            prog.deactivate();
            return done;
        });
    } else {
        return done.then(function(result) {
            prog.deactivate();
            return result;
        });
    }
}


function wait_for_event(program, type, checker) {
    return new Promise(function(resolve, reject) {
        program.events.on(type, resolve);
    })
    .then(function(err) {
        checker(err);
    });
}

function module_resolver(modules) {

    var file_resolver = new FileResolver();

    var direct_resolver = function(name) {
        var module = modules[name];
        if (module) {
            return Promise.resolve({ name: name, source: module });
        }

        return Promise.reject(new Error('Unknown module: ' + name));
    };

    return resolver_utils.multiple([
        direct_resolver,
        file_resolver.resolve
    ]);
}

function options_from_object(options) {
    function _option_is_moment(key) {
        return key === 'from' || key === 'to';
    }

    return _.reduce(options, function(memo, value, key) {
        var formatted_str;
        if (_option_is_moment(key)) {
            formatted_str = util.format(':%s:', value);
        } else if(typeof value === 'string') {
            formatted_str = util.format('"%s"', value);
        } else {
            formatted_str = value;
        }
        return memo + '-' + key + ' ' + formatted_str + ' ';
    }, '');
}

function expect_to_fail(promise, message) {
    return promise.throw(new Error('should have failed'))
        .catch(function(err) {
            expect(err.message).equal(message);
        });
}

// mocha utils

function checkForModule(name) {
    /*
     * check for required module dependency
     */
    try {
        require(name);
    } catch(err) {
        logger.warn('WARNING: skipping test due to unmet dependency on module "' +
                    name + '"');
        return false;
    }

    return true;
}

var mochaIt = global.it;

function withModuleIt(description, fn, module) {
    /*
     * wrapper function for mocha it() so you can skip a test based on module
     * availability.
     *
     *  module: the name of a module that must be require'able for a specific
     *          test to be executed or skipped if the module can not be
     *          required
     *
     * if you have the need to set the same requirements for all tests in a
     * single test suite then use the following approach and redefine it()
     * locally to that one file like so:
     *
     *  var withGrokIt = function(describe, function) {
     *      return require('../../runtime/specs/juttle-test-utils').it(describe, function, 'node-grok');
     *  };
     *
     */
    if (checkForModule(module)) {
        mochaIt(description, fn);
    } else {
        mochaIt.skip(description, fn);
    }
}

// Wrapper around the adapter.configure method
function configureAdapter(config) {
    return adapters.configure(config);
}

// To facilitate unit testing of external juttle adapters, this wrapper function
// makes sure the the JuttleAdapterAPI global is  set during the execution of
// the specified function, which can be used to enclose a set of it() or describe()
// calls that need to pull in portions of the adapter code for tests.
function withAdapterAPI(fn) {
    global.JuttleAdapterAPI = adapterAPI;
    fn();
    global.JuttleAdapterAPI = undefined;
}

module.exports = {
    wait_for_event: wait_for_event,
    get_times: get_times,
    compile_juttle: compile_juttle,
    check_juttle: check_juttle,
    run_juttle: run_juttle,
    module_resolver: module_resolver,
    options_from_object: options_from_object,
    expect_to_fail: expect_to_fail,
    set_stdin: set_stdin,
    set_stdout: set_stdout,

    // Export the utility methods as camelCase as well. Eventually we should
    // deprecate the underscore variants.
    waitForEvent: wait_for_event,
    getTimes: get_times,
    compileJuttle: compile_juttle,
    checkJuttle: check_juttle,
    runJuttle: run_juttle,
    moduleResolver: module_resolver,
    optionsFromObject: options_from_object,
    expectToFail: expect_to_fail,
    setStdin: set_stdin,
    setStdout: set_stdout,

    configureAdapter,
    withAdapterAPI,
    withModuleIt
};

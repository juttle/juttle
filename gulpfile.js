/* globals __dirname */
var _ = require('underscore');
var args   = require('yargs').argv;
var clean = require('gulp-clean');
var debug = require('gulp-debug');
var fs = require('fs');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var istanbul = require('gulp-istanbul');
var jshint = require('gulp-jshint');
var merge = require('merge-stream');
var jscs = require('gulp-jscs');
var mocha = require('gulp-mocha');
var path = require('path');
var peg = require('gulp-peg');
var rename = require("gulp-rename");
var through = require('through2');
// jshint ignore:line
var Promise = require('bluebird');
var marked = require('marked');
var FileResolver = require('./lib/module-resolvers/file-resolver');

var debugOn = args.env === 'debug';

// juttle spec generate tests from markdown
var juttleSpecConvert = require('./test/spec').juttleSpec.convert;
var jspec = function() {
    // I'd promisify this but its not that simple given that we're returning
    // a gulp stream
    return through.obj(function(file, encoding, callback) {
        var markdown = fs.readFileSync(file.path, { encoding: 'utf8' });
        var js = juttleSpecConvert(markdown, { baseDir: __dirname });
        fs.writeFileSync(file.path.replace(/\.[^.]*$/, '.js'), js);
        return callback();
    });
};


gulp.task('juttle-spec-clean', function() {
    return gulp.src('test/runtime/specs/juttle-spec/**/*.js', { read: false })
        .pipe(clean());
});

gulp.task('juttle-spec', ['juttle-spec-clean'], function() {
    return gulp.src('test/runtime/specs/juttle-spec/**/*.md')
        .pipe(jspec());
});

gulp.task('jscs-test', function() {
    return gulp.src([
        'test/**/*.spec.js',
        '!test/runtime/specs/juttle-spec/**/*.js'
    ])
    .pipe(jscs({
        configPath: '.jscsrc'
    }))
    .pipe(jscs.reporter('unix'))
    .pipe(jscs.reporter('fail'));
});

gulp.task('jscs-lib', function() {
    return gulp.src([
        'bin/juttle',
        'lib/**/*.js',

        // exclude generated files
        '!lib/moment/parser.js',
        '!lib/parser/parser.js'
    ])
    .pipe(jscs({
        configPath: '.jscsrc'
    }))
    .pipe(jscs.reporter('unix'))
    .pipe(jscs.reporter('fail'));
});

gulp.task('jshint-test', function() {
    return gulp.src([
        'test/**/*.spec.js',
        '!test/runtime/specs/juttle-spec/**/*.js'
    ])
    .pipe(jshint('./test/.jshintrc'))
    .pipe(jshint.reporter('default', { verbose: true }))
    .pipe(jshint.reporter('fail'));
});

gulp.task('jshint-lib', function() {
    return gulp.src([
        'gulpfile.js',
        'bin/juttle',
        'lib/**/*.js',

        // exclude spec files
        '!lib/**/*.spec.js',

        // exclude generated files
        '!lib/moment/parser.js',
        '!lib/parser/parser.js'
    ])
    .pipe(jshint('./lib/.jshintrc'))
    .pipe(jshint.reporter('default', { verbose: true }))
    .pipe(jshint.reporter('fail'));
});

gulp.task('lint', ['jscs-lib', 'jscs-test', 'jshint-lib', 'jshint-test']);

gulp.task('instrument', function () {
    return gulp.src([
        'lib/**/*.js',

        // exclude generated code
        '!lib/moment/parser.js',
        '!lib/parser/parser.js'
    ])
    .pipe(istanbul({
        includeUntested: true
    }))
    .pipe(istanbul.hookRequire());
});

function gulp_test() {
    return gulp.src('test/**/*.spec.js')
        .pipe(mocha({
            log: true,
            timeout: 5000,
            reporter: 'spec',
            ui: 'bdd',
            ignoreLeaks: true,
            globals: ['should']
        }));
}

gulp.task('test', ['peg', 'juttle-spec'], function() {
    return gulp_test();
});

gulp.task('test-coverage', ['peg', 'juttle-spec', 'instrument'], function() {
    return gulp_test()
        .pipe(istanbul.writeReports())
        .pipe(istanbul.enforceThresholds({
            thresholds: {
                global: {
                    statements: 91,
                    branches: 84,
                    functions: 91,
                    lines: 91
                }
            }
        }));
});

gulp.task('peg-clean', function() {
    return gulp.src([
        // remove all of the pegjs generated files
        'lib/parser/parser.js',
        'lib/moment/parser.js',
        //'extlib/points-parser/points-parser.js'
    ], { read: false })
    .pipe(clean());
});

gulp.task('peg', ['peg-clean'], function() {
    var parserJs = gulp.src('lib/parser/parser.pegjs')
    .pipe(peg({
        allowedStartRules: ['start', 'startFilter', 'startValue'],
        cache: true
    }))
    .pipe(gulp.dest('lib/parser'));

    var momentParserJs = gulp.src('lib/moment/moment-parser.pegjs')
    .pipe(peg({
        cache: true
    }))
    .pipe(rename('parser.js'))
    .pipe(gulp.dest('lib/moment'));

    var pointsParserJs = gulp.src('extlib/points-parser/points-parser.pegjs')
    .pipe(peg())
    .pipe(rename('points-parser.js'))
    .pipe(gulp.dest('extlib/points-parser/'));

    return merge(parserJs, momentParserJs, pointsParserJs);
});

gulp.task('clean', ['juttle-spec-clean', 'peg-clean']);

gulp.task('examples-check', ['peg'], function() {
    // juttle compile check of the syntax of juttle examples
    var compiler = require('./lib/compiler');
    var optimize = require('./lib/compiler/optimize');
    var implicit_views = require('./lib/compiler/flowgraph/implicit_views');

    // Override the adapter get method to return a dummy object for all
    // adapter types that are used in the examples.
    var adapters = require('./lib/runtime/adapters');
    adapters.get = function(name) { return {}; };

    var jcompile = function() {
        return through.obj(function(file, encoding, callback) {
            var juttles = [];
            var ext = path.extname(file.path);
            var contents = fs.readFileSync(file.path, "utf8");
            if (ext === '.juttle') {
                juttles = [contents];
            } else if (ext === '.md') {
                var tokens = marked.lexer(contents);
                juttles = _.pluck(_.filter(tokens, function(t) {
                    return t.type === 'code' && t.lang === 'juttle';
                }), 'text');
            } else {
                callback(new Error('invalid file extension' + ext));
                return;
            }
            var file_resolver = new FileResolver();
            Promise.map(juttles, function(juttle_src) {
                return compiler.compile(juttle_src, {
                    stage: 'compile',
                    moduleResolver: file_resolver.resolve,
                    fg_processors: [implicit_views('table'), optimize]
                });
            })
            .then(function() {
                callback();
            })
            .catch(function(err) {
                callback(new Error('checking ' + file.path + ': ' + err));
            });
        });
    };

    return gulp.src([
        'docs/**/*.md',
        'docs/examples/**/*.juttle',
        '!docs/examples/concepts/import_module_from_url.juttle',
        'examples/*.juttle',
        '!examples/invalid.juttle'
    ])
    .pipe(gulpif(debugOn, debug({title: 'Syntax check: '})))
    .pipe(jcompile());
});

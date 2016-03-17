'use strict';

/* globals __dirname */
var _ = require('underscore');
var args   = require('yargs').argv;
var clean = require('gulp-clean');
var debug = require('gulp-debug');
var eslint = require('gulp-eslint');
var fs = require('fs');
var gulp = require('gulp');
var gulpif = require('gulp-if');
var istanbul = require('gulp-istanbul');
var merge = require('merge-stream');
var mocha = require('gulp-mocha');
var path = require('path');
var peg = require('gulp-peg');
var rename = require('gulp-rename');
var through = require('through2');
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

gulp.task('lint-test', function() {
    return gulp.src([
        'test/**/*.js',
        '!test/runtime/specs/juttle-spec/**/*.js'
    ])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('lint-lib', function() {
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
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task('lint', ['lint-lib', 'lint-test']);

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
            timeout: 10000,
            slow: 3000,
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
                    statements: 92,
                    branches: 87,
                    functions: 91,
                    lines: 92
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

    var pointsParserJs = gulp.src('extlib/points-parser/points-parser.pegjs')
    .pipe(peg())
    .pipe(rename('points-parser.js'))
    .pipe(gulp.dest('extlib/points-parser/'));

    return merge(parserJs, pointsParserJs);
});

gulp.task('clean', ['juttle-spec-clean', 'peg-clean']);

gulp.task('examples-check', ['peg'], function() {
    // juttle compile check of the syntax of juttle examples
    var compiler = require('./lib/compiler');
    var optimize = require('./lib/compiler/optimize');
    var implicit_views = require('./lib/compiler/flowgraph/implicit_views');

    var jcompile = function() {
        return through.obj(function(file, encoding, callback) {
            var juttles = [];
            var ext = path.extname(file.path);
            var contents = fs.readFileSync(file.path, 'utf8');

            // Skip files containing 'examples-check:ignore'. These
            // are files like modules that can't be compiled on their
            // own.
            if (contents.indexOf('examples-check:ignore') > 0) {
                juttles = [];
            } else if (ext === '.juttle') {
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
                    fg_processors: [implicit_views, optimize],
                    filename: file.path
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

    // Override the adapter get method to return a dummy object for all
    // adapter types that are used in the examples.
    var adapters = require('./lib/runtime/adapters');
    var adaptersGet = adapters.get;
    var adaptersIsValid = adapters.isValid;
    adapters.get = function(name) { return {}; };
    adapters.isValid = function(name) { return true; };

    return gulp.src([
        'docs/**/*.md',
        'docs/examples/**/*.juttle',
        '!docs/examples/concepts/import_module_from_url.juttle',
        'examples/*.juttle',
        '!examples/invalid.juttle'
    ])
    .pipe(gulpif(debugOn, debug({title: 'Syntax check: '})))
    .pipe(jcompile())
    .on('end', function() {
        adapters.get = adaptersGet;
        adapters.isValid = adaptersIsValid;
    });
});

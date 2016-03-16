'use strict';

var Promise = require('bluebird');
var _ = require('underscore');
var errors = require('../errors');
var parser = require('./parser');

// Parses a Juttle filter expression synchronously. Returns the resulting AST on
// success, throws `errors.SyntaxError` on failure.
function parseFilter(source) {
    return doParse(source, {
        filename: null,
        startRule: 'startFilter',
        autocompleteCallback: null
    });
}

// Parses a Juttle value synchronously. Returns the resulting AST on success,
// throws `errors.SyntaxError` on failure.
function parseValue(source) {
    return doParse(source, {
        filename: null,
        startRule: 'startValue',
        autocompleteCallback: null
    });
}

// Parses a Juttle program asynchronously. Returns a promise that is resolved
// with the resulting AST on success or rejected with `errors.SyntaxError` on
// failure.
//
// Options:
//
//   * `filename`:             File name of the parsed program, to be used in
//                             location information. Optional, defaults to
//                             `'main'`.
//   * `startRule`:            Rule to start parsing from. Optional, defaults to
//                             `'start'`.
//   * `autocompleteCallback`: Callback for autocomplete events. Optional,
//                             defaults to `null`.
//   * `modules`:              An object mapping module paths to source codes.
//                             Used to resolve imported modules when no
//                             `moduleResolver` is provided. Optional, defaults
//                             to `{}`.
//   * `moduleResolver`:       A function that resolves imported modules. It
//                             takes a module path, module name, and the path
//                             of the file doing the import and returns a
//                             promise which is resolved with an object
//                             describing the resolved module or rejected with
//                             an exception if the module cannot be resolved.
//                             Optional, the `modules` option is used when not
//                             provided.
function parse(juttle, options) {
    var asts = {};

    function defaultResolver(path, name, importerPath) {
        if (_.has(options.modules, path)) {
            return Promise.resolve({
                name: path,
                source: options.modules[path]
            });
        } else {
            return Promise.reject(new Error('Could not find module "' + path + '".'));
        }
    }

    function resolveImport(node) {
        return options.moduleResolver(node.modulename.value, node.localname, options.filename)
            .catch(function(err) {
                throw errors.compileError('MODULE-NOT-FOUND', {
                    module: node.modulename.value,
                    location: node.location
                });
            });
    }

    function parseModule(module) {
        // Don't break on cyclic imports and continue. There is a more proper
        // check in the semantic pass.
        if (_.has(asts, module.name)) {
            return Promise.resolve();
        }

        return Promise.resolve(module.source)
            .then(function(juttle) {
                return doParse(juttle, _.extend(options, { filename: module.name }));
            })
            .then(function(ast) {
                asts[module.name] = ast;

                return ast;
            })
            .then(extractImports)
            .each(checkImport)
            .map(resolveImport)
            .each(parseModule);
    }

    options = processOptions(options, defaultResolver);

    return parseModule({ source: juttle, name: options.filename })
        .then(function() {
            asts.main.modules = buildModuleDefs(asts);

            return asts.main;
        });
}

// Parses a Juttle program synchronously. Returns the resulting AST on success,
// throws `errors.SyntaxError` on failure.
//
// Options:
//
//   * `filename`:             File name of the parsed program, to be used in
//                             location information. Optional, defaults to
//                             `'main'`.
//   * `startRule`:            Rule to start parsing from. Optional, defaults to
//                             `'start'`.
//   * `autocompleteCallback`: Callback for autocomplete events. Optional,
//                             defaults to `null`.
//   * `modules`:              An object mapping module paths to source codes.
//                             Used to resolve imported modules when no
//                             `moduleResolver` is provided. Optional, defaults
//                             to `{}`.
//   * `moduleResolver`:       A function that resolves imported modules. It
//                             takes a module path, module name, and the path
//                             of the file doing the import and returns an
//                             object describing the resolved module or throws
//                             an exception if the module cannot be resolved.
//                             Optional, the `modules` option is used when not
//                             provided.
function parseSync(juttle, options) {
    var asts = {};

    function defaultResolver(path, name, importerPath) {
        if (_.has(options.modules, path)) {
            return {
                name: path,
                source: options.modules[path]
            };
        } else {
            throw new Error('Could not find module "' + path + '".');
        }
    }

    function resolveImport(node) {
        try {
            return options.moduleResolver(node.modulename.value, node.localname, options.filename);
        } catch (e) {
            throw errors.compileError('MODULE-NOT-FOUND', {
                module: node.modulename.value,
                location: node.location
            });
        }
    }

    function parseModule(module) {
        // Don't break on cyclic imports and continue. There is a more proper
        // check in the semantic pass.
        if (_.has(asts, module.name)) {
            return;
        }

        var ast = doParse(module.source, _.extend(options, { filename: module.name }));
        asts[module.name] = ast;

        var imports = extractImports(ast);
        _.chain(imports)
            .each(checkImport)
            .map(resolveImport)
            .each(parseModule);
    }

    options = processOptions(options, defaultResolver);

    parseModule({ source: juttle, name: options.filename });
    asts.main.modules = buildModuleDefs(asts);

    return asts.main;
}

function processOptions(options, defaultResolver) {
    if (options === undefined) {
        options = {};
    }

    return _.defaults(_.clone(options), {
        filename: 'main',
        startRule: 'start',
        autocompleteCallback: null,
        modules: {},
        moduleResolver: defaultResolver
    });
}

function extractImports(ast) {
    return _.filter(ast.elements, function(element) {
        return element.type === 'ImportStatement';
    });
}

function checkImport(node) {
    if (node.modulename.type !== 'StringLiteral') {
        throw errors.compileError('IMPORT-INTERPOLATION', {
            location: node.modulename.location
        });
    }
}

function buildModuleDefs(asts) {
    return _.map(_.omit(asts, 'main'), function(ast, name) {
        return { type: 'ModuleDef', name: name, elements: ast.elements };
    });
}

function doParse(source, options) {
    try {
        return parser.parse(source, options);
    } catch (e) {
        if (e instanceof parser.SyntaxError) {
            processSyntaxError(e, options.filename);
        } else {
            throw e;
        }
    }
}

function processSyntaxError(error, filename) {
    var location = _.extend({ filename: filename }, error.location);
    var expected, expectedDescription, found, foundDescription;

    if (error.expected) {
        // Massage the expectations so that they don't refer to trivialities
        // such as whitespace or comments. Arguably, this should be possible to
        // do in PEG.js itself, but it currently isn't. Also, it's a gross hack,
        // but we'll do everything for our users :-)
        expected = _.reject(error.expected, function(expectation) {
            return expectation.description === 'whitespace'
                || expectation.description === 'end of line'
                || expectation.description === 'comment';
        });
        expectedDescription = buildExpectedDescription(expected);
        found = error.found;
        foundDescription = buildFoundDescription(found);

        throw errors.syntaxError('SYNTAX-ERROR-WITH-EXPECTED', {
            expected: expected,
            expectedDescription: expectedDescription,
            found: found,
            foundDescription: foundDescription,
            location: location
        });
    } else {
        throw errors.syntaxError('SYNTAX-ERROR-WITHOUT-EXPECTED', {
            message: error.message,
            location: location
        });
    }
}

// The following functions are adapted from PEG.js because it currently doesn't
// expose this functionality (and I'm not 100% sure exposing it is a good idea).
// This is the exact code taken as a base:
//
//     https://github.com/pegjs/pegjs/blob/eaca5f0acf97b66ef141fed84aa95d4e72e33757/lib/compiler/passes/generate-javascript.js#L1075-L1119
//

function buildExpectedDescription(expected) {
    var descriptions = _.pluck(expected, 'description');

    return descriptions.length > 1
        ? descriptions.slice(0, -1).join(', ')
              + ' or '
              + descriptions[expected.length - 1]
        : descriptions[0];
}

function buildFoundDescription(found) {
    function stringEscape(s) {
        function hex(ch) { return ch.charCodeAt(0).toString(16).toUpperCase(); }

        // ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
        // string literal except for the closing quote character, backslash,
        // carriage return, line separator, paragraph separator, and line feed.
        // Any character may appear in the form of an escape sequence.
        //
        // For portability, we also escape all control and non-ASCII characters.
        // Note that "\0" and "\v" escape sequences are not used because JSHint
        // does not like the first and IE the second.
        return s
            .replace(/\\/g,   '\\\\')   // backslash
            .replace(/"/g,    '\\"')    // closing double quote
            .replace(/\x08/g, '\\b')    // backspace
            .replace(/\t/g,   '\\t')    // horizontal tab
            .replace(/\n/g,   '\\n')    // line feed
            .replace(/\f/g,   '\\f')    // form feed
            .replace(/\r/g,   '\\r')    // carriage return
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
    }

    return found ? '"' + stringEscape(found) + '"' : 'end of input';
}

module.exports = {
    parseSync: parseSync,
    parseFilter: parseFilter,
    parseValue: parseValue,
    parse: parse,
};

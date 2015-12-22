var Promise = require('bluebird');
var _ = require('underscore');

var parser = require('./parser');
var errors = require('../errors');


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

function buildMessage(expectedDescription, foundDescription) {
    return 'Expected ' + expectedDescription + ' but ' + foundDescription + ' found.';
}

function processSyntaxError(error, filename) {
    var location = _.extend({ filename: filename }, error.location);
    var expected, expectedDescription, found, foundDescription, message;

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
        message = buildMessage(expectedDescription, foundDescription);

        throw errors.syntaxError('JUTTLE-SYNTAX-ERROR-WITH-EXPECTED', {
            expected: expected,
            expectedDescription: expectedDescription,
            found: found,
            foundDescription: foundDescription,
            location: location
        });
    } else {
        throw errors.syntaxError('JUTTLE-SYNTAX-ERROR-WITHOUT-EXPECTED', {
            message: error.message,
            location: location
        });
    }
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

/*
 parseFilter(source)
 ===================

 Takes `source` with a filter expression source code and parses
 it into an AST synchronously.
 */
function parseFilter(source) {
    return parseSync(source, { startRule: "startFilter" });
}

function checkImportNode(node) {
    if (node.modulename.type !== 'StringLiteral') {
        throw errors.compileError('RT-IMPORT-INTERPOLATION', {
            location: node.modulename.location
        });
    }
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

function buildModuleDefs(asts) {
    return _.map(_.omit(asts, 'main'), function(ast, name) {
        return { type: "ModuleDef", name: name, elements: ast.elements };
    });
}

/*
 parseValue(source)
 ==================

 Takes `source` with a Juttle value expression (a literal
 without any external references such as variables) and parses
 it into an AST synchronously.
 */
function parseValue(source) {
    return parseSync(source, { startRule: "startValue" });
}

/*
 parse(source)
 =============

 Takes `source` and returns a promise that is fulfilled with the
 resulting AST. This method supports Juttle programs that use
 modules if `moduleResolver` is specified when `JuttleParser` is
 instantiated.
 */
function parse(juttle, options) {
    function defaultResolver(path, name) {
        if (_.has(options.modules, path)) {
            return Promise.resolve({
                name: path,
                source: options.modules[path]
            });
        } else {
            return Promise.reject(new Error('Could not find module: ' + path));
        }
    }

    function resolveImport(import_) {
        return options.moduleResolver(import_.modulename.value, import_.localname)
            .catch(function(err) {
                throw errors.compileError('RT-MODULE-NOT-FOUND', {
                    module: import_.modulename.value,
                    location: import_.location
                });
            });
    }

    options = processOptions(options, defaultResolver);

    var asts = {};
    function parseModule(module) {
        var ast, imports;
        if (_.has(asts, module.name)) {
            // avoid infinite recursion on cyclic imports
            return Promise.resolve();
        }
        try {
            ast = doParse(module.source, _.extend(options, { filename: module.name }));
        } catch(e) {
            return Promise.reject(e);
        }

        asts[module.name] = ast;
        imports = extractImports(ast);
        _.each(imports, checkImportNode);

        return Promise.map(imports, function(imp) {
            return resolveImport(imp)
                .then(function(res) {
                    return parseModule(res);
                });
        });
    }
    return parseModule({ source: juttle, name: 'main' })
        .then(function() {
            asts.main.modules = buildModuleDefs(asts);
            return asts.main;
        });
}

function parseSync(mainSource, options) {
    function defaultResolver(path, name) {
        if (_.has(options.modules, path)) {
            return {
                name: path,
                source: options.modules[path]
            };
        } else {
            throw new Error("Could not find module: " + path);
        }
    }

    options = processOptions(options, defaultResolver);

    var asts = {};
    function rec(o) {
        var ast, imports, modules;
        if (_.has(asts, o.name)) {
            return [];
        }

        ast = doParse(o.source, _.extend(options, { filename: o.name }));
        asts[o.name] = ast;
        imports = extractImports(ast);
        _.each(imports, checkImportNode);
        modules = imports.map(function(import_) {
            try {
                return options.moduleResolver(
                    import_.modulename.value,
                    import_.localname
                );
            } catch (e) {
                throw errors.compileError('RT-MODULE-NOT-FOUND', {
                    module: import_.modulename.value,
                    location: import_.location
                });
            }
        });

        _.each(modules, rec);
    }

    rec({source: mainSource, name: 'main'});
    asts.main.modules = buildModuleDefs(asts);
    return asts.main;
}


module.exports = {
    parseSync: parseSync,
    parseFilter: parseFilter,
    parseValue: parseValue,
    parse: parse,
};

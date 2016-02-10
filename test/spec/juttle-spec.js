'use strict';

var Base = require('extendable-base');
var marked = require('marked');
var pointsParser = require('../../extlib/points-parser').pointsParser;
var util = require('util');

/* JavaScript code generation helpers. */
var js = {
    stringEscape: function(s) {
        function hex(ch) {
            return ch.charCodeAt(0).toString(16).toUpperCase();
        }

        /*
         * ECMA-262, 5th ed., 7.8.4: All characters may appear literally in a
         * string literal except for the closing quote character, backslash,
         * carriage return, line separator, paragraph separator, and line feed.
         * Any character may appear in the form of an escape sequence.
         *
         * For portability, we also escape all control and non-ASCII characters.
         * Note that "\0" and "\v" escape sequences are not used because JSHint
         * does not like the first and IE the second.
         */
        return s
            .replace(/\\/g,   '\\\\')   // backslash
            .replace(/'/g,    '\\\'')   // closing single quote
            .replace(/\x08/g, '\\b')    // backspace
            .replace(/\t/g,   '\\t')    // horizontal tab
            .replace(/\n/g,   '\\n')    // line feed
            .replace(/\f/g,   '\\f')    // form feed
            .replace(/\r/g,   '\\r')    // carriage return
            .replace(/[\x00-\x07\x0B\x0E\x0F]/g, function(ch) { return '\\x0' + hex(ch); })
            .replace(/[\x10-\x1F\x80-\xFF]/g,    function(ch) { return '\\x'  + hex(ch); })
            .replace(/[\u0100-\u0FFF]/g,         function(ch) { return '\\u0' + hex(ch); })
            .replace(/[\u1000-\uFFFF]/g,         function(ch) { return '\\u'  + hex(ch); });
    },

    indent: function(code) {
        return code.replace(/^(.+)$/gm, '    $1');
    }
};

/* HTML helpers. */
var html = {
    unescape: function(s) {
        /*
         * This captures only cases produced by marked (see the "escape"
         * function in lib/marked.js).
         */
        return s
            .replace(/&lt;/g,   '<')
            .replace(/&gt;/g,   '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g,  '\'')
            .replace(/&amp;/g,  '&');
    }
};

/*
 * Renderer passed to marked that renders a Markdown spec into a JavaScript one.
 *
 * Note that marked expects us to convert Markdown gradually, using mehods that
 * return converted pieces. But I chose to build a simple object representation
 * of the constructed spec instead. This representation then needs to be
 * rendered explicity using the "render" method. The code ends up being cleaner
 * this way.
 *
 * Terminology & structure:
 *
 *   * The whole Markdown thingy is called a *spec*, and it is described by a
 *     level 1 heading.
 *
 *   * The spec consists of several *tests*, introduced by level 2 headings
 *     (e.g. "Returns correct result", "Throws exception on bad input").
 *
 *   * Tests have multiple *sections*, introduced by level 3 headings (e.g.
 *     "Juttle", "Output").
 */
var SpecRenderer = Base.extend({
    initialize: function(options) {
        this.title = null;
        this.tests = [];
        this.section = null;
        this.moduleName = null;

        this.baseDir = options.baseDir;
    },

    check: function() {
        if (this.title === null) {
            throw new Error('Spec is missing a title.');
        }

        this.tests.forEach(this.checkTest);
    },

    checkTest: function(test) {
        if (test.juttle === null) {
            throw new Error('Test "' + test.title + '" is missing the "Juttle" section.');
        }
        if (test.output === null && test.errors.length === 0 && test.warnings.length === 0) {
            throw new Error('Test "' + test.title + '" is missing the "Output", "Errors", or "Warnings" section.');
        }
    },

    render: function() {
        var parts = [];
        var self = this;

        parts.push(this.renderHeader());
        if (this.tests.length > 0) {
            this.tests.forEach(function(test) {
                parts.push('');
                parts.push(js.indent(self.renderTest(test)));
            });
        }
        parts.push(this.renderFooter());

        return parts.join('\n');
    },

    renderHeader: function() {
        return [
            'var expect = require(\'chai\').expect;',
            '',
            'var juttle_test_utils = require(\''
                + js.stringEscape(this.baseDir + '/test/runtime/specs/juttle-test-utils')
                + '\');',
            'var check_juttle = juttle_test_utils.check_juttle;',
            '',
            'describe(\'' + js.stringEscape(this.title) + '\', function() {',
        ].join('\n');
    },

    renderFooter: function() {
        return '}); // describe block \n';
    },

    renderTest: function(test) {
        var parts = [];

        parts.push([
            'it' + test.directive + '(\'' + js.stringEscape(test.title) + '\', function() {',
            '    var program = \'' + js.stringEscape(test.juttle) + '\';',
            '    var moduleResolver = juttle_test_utils.module_resolver(' + JSON.stringify(test.modules) + ');',
            '',
            '    return check_juttle({ program: program, moduleResolver: moduleResolver })',
            '        .then(function(res) {'
        ].join('\n'));

        if (test.output !== null) {
            parts.push('            expect(res.sinks.result).to.deep.equal(' + util.inspect(test.output, { depth: null }) + ');');
        }
        if (test.errors.length > 0) {
            for (var erri=0 ; erri < test.errors.length ; erri++) {
                parts.push('            expect(res.errors[' + erri + ']).to.include(' + JSON.stringify(test.errors[erri]) + ');');
            }
        }
        if (test.warnings.length > 0) {
            for (var warni=0 ; warni < test.warnings.length ; warni++) {
                parts.push('            expect(res.warnings[' + warni + ']).to.include(' + JSON.stringify(test.warnings[warni]) + ');');
            }
        }

        // we have to deactivate the program in order to avoid leaving things
        // like the setInterval objects in the source proc which only get
        // cleaned up when the program is correctly deactivated
        parts.push('        res.prog.deactivate();');

        if (test.errors.length > 0) {
            parts.push([
                '        }, function(err) {',
                '            expect(err.toString()).to.include(' + JSON.stringify(test.errors[0]) + ');',
                '        });'
            ].join('\n'));
        } else {
            parts.push('        });');
        }

        parts.push('});');
        return parts.join('\n');
    },

    /* Block-level Methods */

    heading: function(text, level) {
        text = html.unescape(text);

        switch (level) {
            case 1:   // spec description
                this.title = text;
                break;

            case 2:   // new test
                this.tests.push({
                    title: text,
                    directive: this.getDirective(text),
                    modules: {},
                    juttle: null,
                    output: null,
                    errors: [],
                    warnings: []
                });
                this.section = null;
                break;

            case 3:   // new section
                if (/Module\s+/.test(text)) {
                    this.section = 'module';
                    this.moduleName = text.split(/\s+/)[1];
                } else if (text === 'Juttle') {
                    this.section = 'juttle';
                } else if (text === 'Output') {
                    this.section = 'output';
                } else if (text === 'Errors') {
                    this.section = 'errors';
                } else if (text === 'Warnings') {
                    this.section = 'warnings';
                }
                break;
        }

        return '';
    },

    /*
     * Simple per-test directives
     */
    getDirective: function(text) {
        if (text.match(/^\(skip.*\)/i)) {
            return '.skip';
        } else if (text.match(/^\(only.*\)/i)) {
            return '.only';
        } else {
            return '';
        }
    },

    code: function(code) {
        var test = this.tests[this.tests.length - 1];

        switch (this.section) {
            case 'module':
                test.modules[this.moduleName] = code;
                break;

            case 'juttle':
                test.juttle = code;
                break;

            case 'output':
                test.output = pointsParser.parse(code);
                break;
        }

        return '';
    },

    listitem: function(text) {
        text = html.unescape(text);

        var test = this.tests[this.tests.length - 1];

        switch (this.section) {
            case 'errors':
                test.errors.push(text);
                break;

            case 'warnings':
                test.warnings.push(text);
                break;
        }

        return '';
    },

    blockquote: function() {
        return '';
    },

    hr: function() {
        return '';
    },

    html: function() {
        return '';
    },

    list: function() {
        return '';
    },

    paragraph: function() {
        return '';
    },

    table: function() {
        return '';
    },

    tablecell: function() {
        return '';
    },

    tablerow: function() {
        return '';
    },

    /* Inline-level Methods */
    codespan: function pass(s) {
        return s;
    },

    br: function() {
        return '';
    },

    del: function pass(s) {
        return s;
    },

    em: function pass(s) {
        return s;
    },

    image: function() {
        return '';
    },

    link: function() {
        return '';
    },

    strong: function pass(s) {
        return s;
    }
});

/*
 * Main JuttleSpec module. Wraps converting Markdown specs into JavaScript ones.
 */
var juttleSpec = {
    convert: function(markdown, options) {
        var renderer = new SpecRenderer(options);

        marked(markdown, { renderer: renderer });
        renderer.check();

        return renderer.render();
    }
};

module.exports = juttleSpec;

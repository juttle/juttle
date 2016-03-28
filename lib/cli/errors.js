'use strict';
/* eslint no-console: 0 */

var _ = require('underscore');
var errors = require('../../lib/errors');

var error_string = function(e) {
    return `Error: ${e.message} (${e.code})`;
};

var logger = require('../../lib/logger').getLogger('cli');

// Given an error, a corresponding juttle program, and optional
// filename for that juttle program, return a string that shows the
// error in context.
var show_in_context = function(options) {

    var ret = '';
    var filename;
    var juttle_src;

    options.filename = options.filename || '<input>';

    // Use the location from the error to figure out what juttle
    // source to use. The location is either one of the modules, or
    // it's the main program.
    if (! _.has(options.modules, options.err.info.location.filename)) {
        filename = options.filename;
        juttle_src = options.program;
    } else {
        filename = options.err.info.location.filename;
        ret += 'In module included from ' + options.filename + ':\n';
        juttle_src = options.modules[filename];
    }

    // Find the location of the error. Print up to 5 lines
    // preceding the error, highlight the part of the line related
    // to the error with ^ characters, and print details on the error.
    ret += filename + ':' +
        options.err.info.location.start.line + ':' +
        options.err.info.location.start.column + ': \n';

    var lines = juttle_src.split('\n');
    var start_line = Math.max(options.err.info.location.start.line - 5, 0);
    var end_line = Math.min(start_line + 5, options.err.info.location.start.line);
    var idx = start_line;
    lines = _.map(lines.slice(start_line, end_line), function(line) {
        idx += 1;
        return ('    ' + idx).slice(-4) + ':' + line;
    });
    ret += lines.join('\n');
    ret += '\n';

    // The + 5 here is to account for the width of the preceding
    // padded line number and colon.
    // Also if start and end point to the same location, then pad the end by
    // a column to make sure we print something.
    if (options.err.info.location.start.line === options.err.info.location.end.line) {
        var span = new Array(options.err.info.location.end.column - options.err.info.location.start.column + 1);
        if (span.length === 1) {
            span.length = 2;
        }
        var highlight = Array(options.err.info.location.start.column + 5).join(' ') + span.join('^');
        ret += highlight + '\n';
    }

    ret += error_string(options.err) + '\n';

    return ret;
};

// context should be an object containing:
// program: the source code for the program
// modules: the modules for the program
// filename: the filename of the program
var handle_error = function(e, context) {
    // Log the full error object at debug level to get the stack trace
    logger.debug('got error:', e, Object.keys(e));

    if (e instanceof errors.JuttleError) {
        if (_.has(e, 'info') &&
            _.isObject(e.info.location)) {
            console.error(show_in_context(_.extend({
                err: e
            }, context)));
        } else {
            console.error(error_string(e));
        }
    } else {
        console.error(e.stack);
    }
};

module.exports = {
    show_in_context: show_in_context,
    handle_error: handle_error
};

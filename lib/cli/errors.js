var _ = require('underscore');

// Given an error, a corresponding juttle program, and optional
// filename for that juttle program, return a string that shows the
// error in context.
var show_in_context = function(options) {

    var ret = '';
    var filename;
    var juttle_src;

    options.filename = options.filename || '<input>';

    // Use the location from the error to figure out what juttle
    // source to use. 'main' means the main juttle program, anything
    // else is a module name.
    if (options.err.info.location.filename === 'main') {
        filename = options.filename;
        juttle_src = options.program;
    } else {
        filename = options.err.info.location.filename;
        ret += "In module included from " + options.filename + ":\n";
        juttle_src = options.modules[filename];
    }

    // Find the location of the error. Print up to 5 lines
    // preceding the error, highlight the part of the line related
    // to the error with ^ characters, and print details on the error.
    ret += filename + ":" +
        options.err.info.location.start.line + ":" +
        options.err.info.location.start.column + ": \n";

    var lines = juttle_src.split("\n");
    var start_line = Math.max(options.err.info.location.start.line - 5, 0);
    var end_line = Math.min(start_line + 5, options.err.info.location.start.line);
    var idx = start_line;
    lines = _.map(lines.slice(start_line, end_line), function(line) {
        idx += 1;
        return ("    " + idx).slice(-4) + ":" + line;
    });
    ret += lines.join("\n");
    ret += "\n";

    // The + 5 here is to account for the width of the preceding
    // padded line number and colon.
    if (options.err.info.location.start.line === options.err.info.location.end.line) {
        var highlight = Array(options.err.info.location.start.column + 5).join(" ") +
            Array(options.err.info.location.end.column - options.err.info.location.start.column + 1).join("^");
        ret += highlight + "\n";
    }

    ret += options.err.message + " (" + options.err.code + ")\n";

    return ret;
};

module.exports = {
    show_in_context: show_in_context
};




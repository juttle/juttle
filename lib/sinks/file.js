var TextSink = require('./text.js');
var fs = require('fs');

// A file sink is a text sink with no arguments other than
// format 'json' and writing to a file.
var FileSink = TextSink.extend({
    initialize: function(options) {
        this.options.format = 'json';
        this.filename = options.filename;

        if (! this.filename) {
            throw new Error("File sinks require a -filename argument");
        }

        this.fstream = fs.createWriteStream(this.filename);
    },
});

module.exports = FileSink;

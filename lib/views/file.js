var TextView = require('./text.js');
var fs = require('fs');

// A file view is a text view with no arguments other than
// format 'json' and writing to a file.
var FileView = TextView.extend({
    initialize: function(options) {
        this.options.format = 'json';
        this.filename = options.filename;

        if (! this.filename) {
            throw new Error("File views require a -filename argument");
        }

        this.fstream = fs.createWriteStream(this.filename);
    },
});

module.exports = FileView;

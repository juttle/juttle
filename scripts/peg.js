/*
 * Does essentially what grunt-peg does
 * Needed for when this package is npm installed, the appropriate
 * parsers are created.
 */

var _ = require('underscore');
var path = require('path');
var PEG = require('pegjs');
var Promise = require('bluebird');
var fs = Promise.promisifyAll(require('fs'));

var parseFiles = [
    {
        src: '../lib/parser/parser.pegjs',
        dest: '../lib/parser/parser.js',
        opts: {
            allowedStartRules: ['start', 'startFilter', 'startValue'],
            cache: true
        }
    },
    {
        src: '../extlib/points-parser/points-parser.pegjs',
        dest: '../extlib/points-parser/points-parser.js'
    }
]

Promise.map(parseFiles, function(parseFile) {
    return fs.readFileAsync(path.join(__dirname, parseFile.src), 'utf8')
    .then(function(data) {
        var source = PEG.buildParser(data, _.extend({ output: 'source'}, parseFile.opts));
        var parser = 'module.exports = ' + source + ';\n';

        return fs.writeFileAsync(path.join(__dirname, parseFile.dest), parser, 'utf8');
    });
});

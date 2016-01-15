var _ = require('underscore');
var csv = require('./csv');
var errors = require('../../errors');
var grok = require('./grok');
var json = require('./json');
var jsonl = require('./jsonl');

var parserLookup = {
    'csv': csv,
    'json': json,
    'jsonl': jsonl,
    'grok': grok
};

module.exports = {
    getParser: function(type, options) {
        var parser = parserLookup[type];
        options = options ? options : {};

        if (parser) {
            return new parser(options);
        } else {
            throw errors.runtimeError('RT-INVALID-OPTION-VALUE',{
                option: 'format',
                supported: _.keys(parserLookup).join(', ')
            });
        }
    }
};

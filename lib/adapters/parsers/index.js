'use strict';

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

        // single place that we can put this to make sure that we don't have
        // to duplicate this on every adapter that uses this parser
        if (type !== 'grok' && options.pattern) {
            throw errors.runtimeError('RT-INVALID-OPTION-COMBINATION',{
                option: 'pattern',
                rule: 'format="grok"'
            });
        }

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

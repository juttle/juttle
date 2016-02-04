'use strict';

var _ = require('underscore');
var csv = require('./csv');
var errors = require('../../errors');
var json = require('./json');
var jsonl = require('./jsonl');

var serializerLookup = {
    'csv': csv,
    'json': json,
    'jsonl': jsonl
};

module.exports = {
    getSerializer: function(type, stream, options) {
        var serializer = serializerLookup[type];

        if (serializer) {
            return new serializer(stream, options);
        } else {
            throw errors.runtimeError('INVALID-OPTION-VALUE',{
                option: 'format',
                supported: _.keys(serializerLookup).join(', ')
            });
        }
    }
};

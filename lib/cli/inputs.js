'use strict';

var _ = require('underscore');

module.exports = {

    parseInputs: function(inputs) {
        //
        // For command-line input values, try to parse them as numbers. To pass
        // a number that is really a string requires something like --input X=\"1\"
        //
        var result = {};

        if (!inputs) {
            return result;
        }

        if (! _.isArray(inputs)) {
            inputs = [inputs];
        }
        _.each(inputs, function(value) {
            var parts = value.split('=');
            if (parts.length !== 2) {
                throw Error('Invalid input: ' + value);
            }
            var num = +parts[1];
            if (isNaN(num)) {
                // replace all \" with nothing since that was necessary to
                // to make an input number be parsed as a string
                result[parts[0]] = parts[1].replace(/\"/g, '');
            } else {
                result[parts[0]] = num;
            }
        });

        return result;
    }
};

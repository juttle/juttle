// Juttle error utilities.

var juttleErrors = require('../errors');
var values = require('./values');

function valueString(value) {
    if (values.isNull(value)) {
        return '';
    } else {
        return ' (' + values.toString(value) + ')';
    }
}


var errors = {
    typeErrorUnary: function(operator, value) {
        var message = 'Invalid operand type for "' + operator + '": '
            + values.typeDisplayName(values.typeOf(value)) + valueString(value) + '.';

        return juttleErrors.runtimeError('RT-TYPE-ERROR', { message: message });
    },

    typeErrorBinary: function(operator, left, right) {
        var message = 'Invalid operand types for "' + operator + '": '
            + values.typeDisplayName(values.typeOf(left)) + valueString(left)
            + ' and '
            + values.typeDisplayName(values.typeOf(right)) + valueString(right) + '.';

        return juttleErrors.runtimeError('RT-TYPE-ERROR', { message: message });
    },

    typeErrorFunction: function(name, expected, value) {
        var message = 'Invalid argument type for "' + name + '": '
            + 'expected ' + expected
            + ', received '
            + values.typeDisplayName(values.typeOf(value)) + valueString(value) + '.';

        return juttleErrors.runtimeError('RT-TYPE-ERROR', { message: message });
    },

    typeErrorTime: function(value) {
        var message = 'Invalid type assigned to time: '
            + values.typeDisplayName(values.typeOf(value)) + valueString(value) + '.';

        return juttleErrors.runtimeError('RT-TYPE-ERROR', { message: message });
    }
};

module.exports = errors;

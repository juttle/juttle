'use strict';

var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;
var util = require('util');

module.exports = {

    run_read_file_juttle: function(filename, options, extra) {
        options = options || {};
        extra = extra || '';
        var options_str = juttle_test_utils.options_from_object(options);
        var program = util.format('read file -file "%s" %s %s', filename, options_str, extra);

        return check_juttle({
            program: program
        });
    }
};


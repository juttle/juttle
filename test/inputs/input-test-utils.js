'use strict';

function expectError(fn) {
    let err;

    try {
        fn();
    } catch (e) {
        err = e;
    }

    if (!err) throw new Error('expected function to throw error');

    return err;
}

module.exports = {
    expectError: expectError
};

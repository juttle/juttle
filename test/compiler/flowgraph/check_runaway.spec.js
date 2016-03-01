'use strict';

var expect = require('chai').expect;
var juttle_test_utils = require('../../runtime/specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('Runaway program detection', function() {

    it('does not detect a runaway program from a live read', () => {
        return check_juttle({
            program: 'read stochastic -to :end:'
        }, 50) // stop the live program after 100ms
        .then((results) => {
            expect(results.errors).to.deep.equal([]);
            expect(results.warnings).to.deep.equal([]);
        });
    });

    it('detects a runaway program from a live read to a tail 1', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | tail 1 '
        }) // stop the live program after 100ms
        .then((results) => {
            throw Error('runaway detector failed to catch');
        })
        .catch((err) => {
            expect(err.code).to.equal('RUNAWAY-PROGRAM');
        });
    });

    it('detects a runaway program from a superquery read to a tail 1', () => {
        return check_juttle({
            program: 'read stochastic -from :0: -to :end: | tail 1 '
        }) // stop the live program after 100ms
        .then((results) => {
            throw Error('runaway detector failed to catch');
        })
        .catch((err) => {
            expect(err.code).to.equal('RUNAWAY-PROGRAM');
        });
    });

    it('does not detect a runaway program from a live read with batch to a tail 1', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | batch -every :1s: | tail 1 '
        }, 50) // stop the live program after 100ms
        .then((results) => {
            expect(results.errors).to.deep.equal([]);
            expect(results.warnings).to.deep.equal([]);
        });
    });

    it('detects a runaway program from a live read to sort', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | sort field'
        }) // stop the live program after 100ms
        .then((results) => {
            throw Error('runaway detector failed to catch');
        })
        .catch((err) => {
            expect(err.code).to.equal('RUNAWAY-PROGRAM');
        });
    });

    it('detects a runaway program from a superquery read to sort', () => {
        return check_juttle({
            program: 'read stochastic -from :0: -to :end: | sort field'
        }) // stop the live program after 100ms
        .then((results) => {
            throw Error('runaway detector failed to catch');
        })
        .catch((err) => {
            expect(err.code).to.equal('RUNAWAY-PROGRAM');
        });
    });

    it('does not detect a runaway program from a live read with batch to sort', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | put field=count() | batch -every :1s: | sort field '
        }, 50) // stop the live program after 100ms
        .then((results) => {
            expect(results.errors).to.deep.equal([]);
            expect(results.warnings).to.deep.equal([]);
        });
    });

    it('does not detect a runaway program from a live read with reduce -every', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | reduce -every :1s: count()'
        }, 50) // stop the live program after 100ms
        .then((results) => {
            expect(results.errors).to.deep.equal([]);
            expect(results.warnings).to.deep.equal([]);
        });
    });

    it('does not detect a runaway program from a live read with batch to reduce', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | batch :1s: | reduce count() '
        }, 50) // stop the live program after 100ms
        .then((results) => {
            expect(results.errors).to.deep.equal([]);
            expect(results.warnings).to.deep.equal([]);
        });
    });

    it('does not detect a runaway program from a historical read to reduce', () => {
        return check_juttle({
            program: 'read stochastic -to :now: | reduce count() '
        }, 50) // stop the live program after 100ms
        .then((results) => {
            expect(results.errors).to.deep.equal([]);
            expect(results.warnings).to.deep.equal([]);
        });
    });

    it('detects a runaway program when there are multiple read sources', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | reduce count() | view results1; read stochastic -last :1m: | reduce count() | view results2'
        }) // stop the live program after 100ms
        .then((results) => {
            throw Error('runaway detector failed to catch');
        })
        .catch((err) => {
            expect(err.code).to.equal('RUNAWAY-PROGRAM');
        });
    });

    it('detects a runaway program when there are multiple levels of procs used', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | put a = count() | filter foo="bar" | reduce count() | put a = count()'
        }) // stop the live program after 100ms
        .then((results) => {
            throw Error('runaway detector failed to catch');
        })
        .catch((err) => {
            expect(err.code).to.equal('RUNAWAY-PROGRAM');
        });
    });

    it('detects a runaway program when there are multiple reducers and one without -every', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | reduce -every :1s: count() | reduce max(m)'
        }) // stop the live program after 100ms
        .then((results) => {
            throw Error('runaway detector failed to catch');
        })
        .catch((err) => {
            expect(err.code).to.equal('RUNAWAY-PROGRAM');
        });
    });

    it('does not detect a runaway program from a live read to head', () => {
        return check_juttle({
            program: 'read stochastic -to :end: | head 1'
        }, 50) // stop the live program after 100ms
        .then((results) => {
            expect(results.errors).to.deep.equal([]);
            expect(results.warnings).to.deep.equal([]);
        });
    });
});

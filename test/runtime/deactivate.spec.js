var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

var expect = require('chai').expect;

var emit = require('../../lib/runtime/procs/emit');
var base = require('../../lib/runtime/procs/base');

describe('Program deactivation', function() {
    var teardowns;
    beforeEach(function() { teardowns = []; });
    before(function() {
        base.prototype.teardown_ = base.prototype.teardown;
        emit.prototype.teardown_ = emit.prototype.teardown;

        base.prototype.teardown = emit.prototype.teardown = function() { teardowns.push(this.procName); };
    });
    after(function() {
        base.prototype.teardown = base.prototype.teardown_;
        emit.prototype.teardown = emit.prototype.teardown_;
    });

    it('teardown() is called on all procs (simple program)', function() {
        var prog = 'emit -limit 1 -from :-1m: | view result';
        return check_juttle({program: prog}).then(function(res) {
            res.prog.deactivate();
            expect(teardowns.sort()).to.deep.equal(['emit', 'view']);
        });
    });
    it('teardown() is called on all procs (complicated program)', function() {
        var prog = '(emit -limit 1 -from :-1m: ; emit -limit 1 -from :-1m:)  | (put a = 1; put b = 1)| (view result1; view result2)';
        return check_juttle({program: prog}).then(function(res) {
            res.prog.deactivate();
            expect(teardowns.sort()).to.deep.equal(['emit', 'emit', 'put', 'put', 'view', 'view']);
        });
    });
});

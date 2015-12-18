var _ = require('underscore');
var expect = require('chai').expect;
var juttle_test_utils = require('./specs/juttle-test-utils');
var check_juttle = juttle_test_utils.check_juttle;

describe('Juttle Object Literal Tests', function() {

    function sink_options(prog, idx) {
        return prog.get_sinks()[idx].options;
    }

    it('passes object literal to sink', function() {
        var optionObject = { something: 3 };

        return check_juttle({
            program: 'emit -limit 1 | view result -o '+ JSON.stringify(optionObject)
        })
            .then(function(res) {
                var options = sink_options(res.prog, 0);
                expect(_(options).omit('now')).to.deep.equal(optionObject);
            });
    });

    it('correctly deals with option precendence', function() {
        var optionObject = { foo: 'bar', something: 3 };
        var optionObject2 = { something: 17 };

        return check_juttle({
            program: 'emit -limit 1 | view result -o '+ JSON.stringify(optionObject)
                                              +' -o '+ JSON.stringify(optionObject2)
        })
            .then(function(res) {
                var options = sink_options(res.prog, 0);
                expect(_(options).omit('now')).to.deep.equal(_(optionObject).extend(optionObject2));
            });
    });

    it('overrides option from object', function() {
        var optionObject = { something: 3 };
        var expectedObject = { something: 4 };

        return check_juttle({
            program: 'emit -limit 1 | view result -o '+ JSON.stringify(optionObject) +' -something 4'
        })
            .then(function(res) {
                var options = sink_options(res.prog, 0);
                expect(_(options).omit('now')).to.deep.equal(expectedObject);
            });
    });

    it('overrides option with object', function() {
        var optionObject = { something: 3 };

        return check_juttle({
            program: 'emit -limit 1 | view result -something 4 -o '+ JSON.stringify(optionObject)
        })
            .then(function(res) {
                var options = sink_options(res.prog, 0);
                expect(_(options).omit('now')).to.deep.equal(optionObject);
            });
    });

    it('passes object literal to sink from const', function() {
        var optionObject = { something: 3 };

        return check_juttle({
            program: 'const foo = '+ JSON.stringify(optionObject) +'; emit -limit 1 | view result -o foo'
        })
            .then(function(res) {
                var options = sink_options(res.prog, 0);
                expect(_(options).omit('now')).to.deep.equal(optionObject);
            });
    });

    it('passes object literal to sink from function', function() {
        var optionObject = { something: 3 };

        return check_juttle({
            program: 'function foo() { return '+ JSON.stringify(optionObject) +'; } emit -limit 1 | view result -o foo()'
        })
            .then(function(res) {
                var options = sink_options(res.prog, 0);
                expect(_(options).omit('now')).to.deep.equal(optionObject);
            });
    });

    it('rejects non-object to sink from const', function(done) {
        var optionObject = 3;

        check_juttle({
            program: 'const foo = '+ JSON.stringify(optionObject) +'; emit -limit 1 | view result -o foo'
        })
            .then(function(res) {
                done(new Error('Received unexpected response!'));
            })
            .catch(function(error) {
                expect(error.message).to.equal('Error:  called with non-object argument to -o/-options');
                done();
            });
    });
});

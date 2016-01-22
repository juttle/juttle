'use strict';

var expect = require('chai').expect;
var inputs = require('../../lib/cli/inputs');

describe('cli/inputs', function() {

    describe('parseInputs ', function() {
        it('fails when given invalid input value', function() {
            expect(function() {
                inputs.parseInputs('banana');
            }).to.throw(Error, 'Invalid input: banana');
        });

        it('parses undefined without failures', function() {
            expect(inputs.parseInputs('')).to.deep.equal({});
        });

        it('parses a single input correctly', function() {
            expect(inputs.parseInputs('foo=bar')).to.deep.equal({ foo: 'bar' });
        });

        it('parses an array of inputs correctly', function() {
            expect(inputs.parseInputs([
                'foo=bar',
                'fizz=buzz'
            ])).to.deep.equal({
                foo: 'bar',
                fizz: 'buzz'
            });
        });

        it('parse an integer correctly', function() {
            expect(inputs.parseInputs('x=3')).to.deep.equal({ x: 3 });
        });

        it('parse an float correctly', function() {
            expect(inputs.parseInputs('x=3.14')).to.deep.equal({ x: 3.14 });
        });

        it('parses a string correctly', function() {
            expect(inputs.parseInputs('x="3.14"')).to.deep.equal({ x: '3.14' });
        });
    });
});

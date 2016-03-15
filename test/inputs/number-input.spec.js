'use strict';

var expect = require('chai').expect;
var NumberInput = require('../../lib/inputs/number-input');
var expectError = require('./input-test-utils').expectError;

describe('number input', () => {
    describe('valid cases', () => {
        const testObj = {
            id: 'id',
            type: 'number',
            value: 1,
            params: {
                default: 1
            }
        };

        function updateTestObj(update) {
            return Object.assign({}, testObj, update);
        }

        it('handles normal input with default and value', () => {
            let input = new NumberInput('id', testObj.params);
            expect(input.toObj()).to.deep.equal(testObj);

            input.setValue(2);
            expect(input.toObj()).to.deep.equal(updateTestObj({
                value: 2
            }));
        });

        it('not setting value or default has value of 0', () => {
            let input = new NumberInput('id');
            expect(input.value).to.equal(0);
        });
    });

    describe('error cases', () => {
        it('non number default throws error', () => {
            let err = expectError(() => new NumberInput('id', { default: { 'obj': 5 } }));

            expect(err.code).to.equal('INPUT-INVALID-PARAM');
            expect(err.info).to.contain({
                input_id: 'id',
                param: 'default'
            });
            expect(err.info.param_value).to.eql({ 'obj': 5 });
        });

        it('setting string value throws error', () => {
            let input = new NumberInput('id');
            let err = expectError(() => input.setValue('hi'));

            expect(err.code).to.equal('INPUT-INVALID-VALUE');
            expect(err.info).to.contain({
                input_id: 'id',
                value: 'hi'
            });
        });
    });
});

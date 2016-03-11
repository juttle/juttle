'use strict';

var expect = require('chai').expect;
var NumberInput = require('../../lib/inputs/number-input');

describe('number input', () => {
    describe('valid cases', () => {
        const testObj = {
            id: 'id',
            type: 'number',
            value: 1,
            options: {
                default: 1
            }
        };

        function updateTestObj(update) {
            return Object.assign({}, testObj, update);
        }

        it('handles normal input with default and value', () => {
            let input = new NumberInput('id', testObj.options);
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
            expect(() => {
                new NumberInput('id', {
                    default: { 'obj': 5 }
                });
            }).to.throw(/invalid input value/);
        });

        it('setting string value throws error', () => {
            let input = new NumberInput('id');

            expect(() => input.setValue('hi')).to.throw(/invalid input value/);
        });
    });
});

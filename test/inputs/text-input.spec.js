'use strict';

var expect = require('chai').expect;
var TextInput = require('../../lib/inputs/text-input');

describe('text input', () => {
    describe('valid cases', () => {
        const testObj = {
            id: 'id',
            type: 'text',
            value: 'default value',
            options: {
                default: 'default value'
            }
        };

        function updateTestObj(update) {
            return Object.assign({}, testObj, update);
        }

        it('handles normal text input with default and value', () => {
            let input = new TextInput('id', testObj.options);
            expect(input.toObj()).to.deep.equal(testObj);

            input.setValue('other value');
            expect(input.toObj()).to.deep.equal(updateTestObj({
                value: 'other value'
            }));
        });

        it('not setting value or default has value of emptry string', () => {
            let input = new TextInput('id');

            expect(input.toObj()).to.deep.equal({
                id: 'id',
                type: 'text',
                value: '',
                options: {}
            });
        });

        it('coerce number values into strings', () => {
            let input = new TextInput('id', {
                default: 5
            });
            input.setValue(10);

            expect(input.toObj()).to.deep.equal(updateTestObj({
                value: '10',
                options: {
                    default: 5
                }
            }));
        });
    });

    describe('error cases', () => {
        it('non string or number default throws error', () => {
            expect(() => {
                new TextInput('id', {
                    default: { 'obj': 5 }
                });
            }).to.throw(/invalid input value/);
        });

        it('non string or number value throws error', () => {
            let input = new TextInput('id', {
                default: 'default'
            });

            expect(input.setValue.bind(input, [1, 2])).to.throw(/invalid input value/);
        });
    });
});

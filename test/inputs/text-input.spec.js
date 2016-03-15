'use strict';

var expect = require('chai').expect;
var TextInput = require('../../lib/inputs/text-input');
var expectError = require('./input-test-utils').expectError;

describe('text input', () => {
    describe('valid cases', () => {
        const testObj = {
            id: 'id',
            type: 'text',
            value: 'default value',
            params: {
                default: 'default value'
            }
        };

        function updateTestObj(update) {
            return Object.assign({}, testObj, update);
        }

        it('handles normal text input with default and value', () => {
            let input = new TextInput('id', testObj.params);
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
                params: {}
            });
        });

        it('coerce number values into strings', () => {
            let input = new TextInput('id', {
                default: 5
            });
            input.setValue(10);

            expect(input.toObj()).to.deep.equal(updateTestObj({
                value: '10',
                params: {
                    default: '5'
                }
            }));
        });
    });

    describe('error cases', () => {
        it('non string or number default throws error', () => {
            let err = expectError(() => {
                new TextInput('id', { default: { 'obj': 5 } });
            });

            expect(err.code).to.equal('INPUT-INVALID-PARAM');
            expect(err.info).to.contain({
                input_id: 'id',
                param: 'default'
            });
            expect(err.info.param_value).to.deep.equal({ 'obj': 5 });
        });

        it('non string or number value throws error', () => {
            let input = new TextInput('id', {
                default: 'default'
            });

            let err = expectError(() => input.setValue([1, 2]));

            expect(err.code).to.equal('INPUT-INVALID-VALUE');
            expect(err.info.input_id).to.equal('id');
            expect(err.info.value).to.eql([1, 2]);
        });
    });
});

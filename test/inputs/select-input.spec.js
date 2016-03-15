'use strict';

var expect = require('chai').expect;
var SelectInput = require('../../lib/inputs/select-input');
var expectError = require('./input-test-utils').expectError;

const testObj = {
    id: 'id',
    type: 'select',
    value: '1',
    params: {
        default: '1',
        items: [
            {value: '1', label: '1'},
            {value: '2', label: '2'},
            {value: '3', label: '3'}
        ]
    }
};

const updateTestObj = (updateObj) => {
    return Object.assign({}, testObj, updateObj);
};

describe('select-input', () => {
    describe('valid cases', () => {
        it('handles normal text input with default and value', () => {
            let select = new SelectInput('id', testObj.params);
            expect(select.toObj()).to.deep.equal(testObj);

            select.setValue('2');
            expect(select.toObj()).to.deep.equal(updateTestObj({
                value: '2'
            }));
        });

        it('properly transforms items with shortened syntax', () => {
            let select = new SelectInput('id', {
                default: '1',
                items: [ '1', '2', '3']
            });
            expect(select.toObj()).to.deep.equal(testObj);
        });

        it('propery transforms array items with shortened syntax', () => {
            let select = new SelectInput('id', {
                items: [['1', '2', '3'], ['4', '5', '6']]
            });
            expect(select.toObj()).to.deep.equal(updateTestObj({
                value: ['1', '2', '3'],
                params: {
                    items: [
                        { value: ['1', '2', '3'], label: '1,2,3' },
                        { value: ['4', '5', '6'], label: '4,5,6' }
                    ]
                }
            }));

            select.setValue(['4', '5', '6']);
            expect(select.toObj()).to.deep.equal(updateTestObj({
                value: ['4', '5', '6'],
                params: {
                    items: [
                        { value: ['1', '2', '3'], label: '1,2,3' },
                        { value: ['4', '5', '6'], label: '4,5,6' }
                    ]
                }
            }));
        });

        it('defaults to first value when no default is specified', () => {
            let select = new SelectInput('id', {
                items: ['first', 'second', 'third']
            });
            expect(select.toObj()).to.deep.equal(updateTestObj({
                value: 'first',
                params: {
                    items: [
                        { value: 'first', label: 'first' },
                        { value: 'second', label: 'second' },
                        { value: 'third', label: 'third' }
                    ]
                }
            }));
        });
    });

    describe('error cases', () => {
        it('instantiating without params.items throws error', () => {
            let error = expectError(() => new SelectInput('id'));

            expect(error.code).to.equal('INPUT-REQ-PARAMS-MISSING');
            expect(error.info).to.contain({
                input_id: 'id',
                missing_params: 'items'
            });
        });

        it('instantiating with non-array params.items throws error', () => {
            let error = expectError(() => new SelectInput('id', {
                items: { 'error': 'error' }
            }));

            expect(error.code).to.equal('INPUT-INVALID-PARAM');
            expect(error.info).to.contain({ input_id: 'id', param: 'items' });
            expect(error.info.param_value).to.eql({ 'error': 'error' });
        });

        it('setting invalid value throw error', () => {
            let input = new SelectInput('id', testObj.params);
            let error = expectError(() => input.setValue('ten'));

            expect(error.code).to.equal('INPUT-INVALID-VALUE');
            expect(error.info).to.contain({
                input_id: 'id',
                value: 'ten'
            });
        });

        it('item thats an object without a label and value throws error', () => {
            let error = expectError(() => new SelectInput('id', {
                items: [ '4', '5', { error: 'error' } ]
            }));

            expect(error.code).to.equal('INPUT-INVALID-PARAM');
            expect(error.info).to.contain({ input_id: 'id', param: 'items' });
            expect(error.info.param_value).to.eql([ '4', '5', { error: 'error' }]);
        });
    });
});

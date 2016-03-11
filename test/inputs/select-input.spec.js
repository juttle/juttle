'use strict';

var expect = require('chai').expect;
var SelectInput = require('../../lib/inputs/select-input');

const testObj = {
    id: 'id',
    type: 'select',
    value: '1',
    options: {
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
            let select = new SelectInput('id', testObj.options);
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

        it('defaults to first value when no default is specified', () => {
            let select = new SelectInput('id', {
                items: ['first', 'second', 'third']
            });
            expect(select.toObj()).to.deep.equal(updateTestObj({
                value: 'first',
                options: {
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
        it('instantiating without options.items throws error', () => {
            expect(() => new SelectInput('id')).to.throw(/invalid options/);
        });

        it('instantiating with non-array options.items throws error', () => {
            expect(() => new SelectInput('id', { items: { 'error': 'error' } })).to.throw(/invalid options/);
        });

        it('setting invalid value throw error', () => {
            let input = new SelectInput('id', testObj.options);
            expect(() => input.setValue('ten')).to.throw(/invalid value/);
        });
    });
});

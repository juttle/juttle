var expect = require('chai').expect;
var Head = require('../../lib/runtime/procs/head');
var Groups = require('../../lib/runtime/groups');

// FIXME: The groups are coupled to procs only to emit a warning.
var head = new Head({}, {}, null, null, {id: 'fake', trigger:function() {}});

describe('groups tests', function() {
    describe('non-scalars', function() {
        it('array', function() {
            var points = [
                {scalar: 1, list: [1, 2, 3]},
                {scalar: 2, list: [4, 5, 6]},
                {scalar: 1, list: [1, 2, 3]},
            ];

            var groups = new Groups(head, {groupby: 'list'});
            var keys = [];

            points.forEach(function(p) {
                keys.push(groups.lookup_key(p));
            });

            expect(keys).to.deep.equal([0, 1, 0]);
        });

        it('array nested', function() {
            var points = [
                {scalar: 1, list: [1, 2, {scalar: 3}]},
                {scalar: 2, list: [4, 5, {scalar: 6}]},
                {scalar: 3, list: [1, 2, {scalar: 3}]},
            ];

            var groups = new Groups(head, {groupby: 'list'});
            var keys = [];

            points.forEach(function(p) {
                keys.push(groups.lookup_key(p));
            });

            expect(keys).to.deep.equal([0, 1, 0]);
        });

        it('object', function() {
            var points = [
                {scalar: 1, object: {scalar: 3}},
                {scalar: 2, object: {scalar: 6}},
                {scalar: 3, object: {scalar: 3}},
            ];

            var groups = new Groups(head, {groupby: 'object'});
            var keys = [];

            points.forEach(function(p) {
                keys.push(groups.lookup_key(p));
            });

            expect(keys).to.deep.equal([0, 1, 0]);
        });

        it('object nested', function() {
            var points = [
                {scalar: 1, object: {list: [3]}},
                {scalar: 2, object: {list: [6]}},
                {scalar: 3, object: {list: [3]}},
            ];

            var groups = new Groups(head, {groupby: 'object'});
            var keys = [];

            points.forEach(function(p) {
                keys.push(groups.lookup_key(p));
            });

            expect(keys).to.deep.equal([0, 1, 0]);
        });
    });
});

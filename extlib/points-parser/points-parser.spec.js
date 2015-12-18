var expect = require('chai').expect;
var testutils = require('testutils');

var pointsParser = require('./points-parser');

testutils.mode.server();

/* Note: This is just a basic sanity check, not a full spec. */

describe("Juttle points parser", function() {
    it("parses sequences of Juttle points", function() {
        var points = [
                '{ time: "1970-01-01T00:00:01.000Z" }',
                '{ time: "1970-01-01T00:00:02.000Z" }',
                '{ time: "1970-01-01T00:00:03.000Z" }'
            ].join('\n');

        expect(pointsParser.parse(points)).to.deep.equal([
            { time: '1970-01-01T00:00:01.000Z' },
            { time: '1970-01-01T00:00:02.000Z' },
            { time: '1970-01-01T00:00:03.000Z' }
        ]);
    });
});

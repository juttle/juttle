var expect = require('chai').expect;
var TextSink = require('../../lib/sinks').TextSink;
var streams = require('memory-streams');

describe('Text sink', function () {

    it('default outputs JSON', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            fstream: stream
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        textSink.consume(data);
        textSink.eof();
        expect(JSON.parse(stream.toString())).to.deep.equal(data);
    });

    it('no input produces a valid JSON response', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            fstream: stream
        });

        textSink.eof();
        expect(JSON.parse(stream.toString())).to.deep.equal([]);
    });


    it('-format "json" -indent 4 produces valid JSON output', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'json',
            indent: 4,
            fstream: stream
        });
        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        textSink.consume(data);
        textSink.eof();
        var expected = JSON.stringify(data, null, 4) + '\n';
        expect(stream.toString()).to.equal(expected);
    });

    it('-format "json" produces valid JSON output', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'json',
            fstream: stream
        });
        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        textSink.consume(data);
        textSink.eof();
        expect(JSON.parse(stream.toString())).to.deep.equal(data);
    });

    it('-format "csv" produces valid CSV output', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'csv',
            fstream: stream
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        textSink.consume(data);
        textSink.eof();
        expect(stream.toString().split('\n')).to.deep.equal([
            '"time","value"',
            '"2014-01-01T00:00:01.000Z","1"',
            '"2014-01-01T00:00:02.000Z","2"',
            '"2014-01-01T00:00:03.000Z","3"',
            '' // last \n produces a last empty element
        ]);
    });

    it('-format "jsonl" produces valid JSON lines output', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'jsonl',
            fstream: stream
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        textSink.consume(data);
        textSink.eof();
        var output = stream.toString().split('\n');
        expect(JSON.parse(output[0])).to.deep.equal({ time: '2014-01-01T00:00:01.000Z', value: 1});
        expect(JSON.parse(output[1])).to.deep.equal({ time: '2014-01-01T00:00:02.000Z', value: 2});
        expect(JSON.parse(output[2])).to.deep.equal({ time: '2014-01-01T00:00:03.000Z', value: 3});
    });

    it('-format "raw" produces valid raw debug output', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'raw',
            fstream: stream
        });

        var data = [
            { time: '2014-01-01T00:00:01.000Z', value: 1 },
            { time: '2014-01-01T00:00:02.000Z', value: 2 },
            { time: '2014-01-01T00:00:03.000Z', value: 3 },
        ];

        textSink.consume(data);
        textSink.eof();
        var output = stream.toString().split('\n');
        expect(JSON.parse(output[0])).to.deep.equal({ time: '2014-01-01T00:00:01.000Z', value: 1});
        expect(JSON.parse(output[1])).to.deep.equal({ time: '2014-01-01T00:00:02.000Z', value: 2});
        expect(JSON.parse(output[2])).to.deep.equal({ time: '2014-01-01T00:00:03.000Z', value: 3});
        expect(output[3]).to.equal('==============================================================');
    });

    it('-format "raw" with -marks true produces correct marks', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'raw',
            marks: true,
            fstream: stream
        });

        textSink.consume([{ time: '2014-01-01T00:00:01.000Z', value: 1 }]);
        textSink.mark();
        textSink.consume([{ time: '2014-01-01T00:00:02.000Z', value: 2 }]);
        textSink.mark();
        textSink.consume([{ time: '2014-01-01T00:00:03.000Z', value: 3 }]);
        textSink.mark();
        textSink.eof();

        var output = stream.toString().split('\n');
        expect(JSON.parse(output[0])).to.deep.equal({ time: '2014-01-01T00:00:01.000Z', value: 1});
        expect(output[1]).to.equal('--------------------------------------------------------------');
        expect(JSON.parse(output[2])).to.deep.equal({ time: '2014-01-01T00:00:02.000Z', value: 2});
        expect(output[3]).to.equal('--------------------------------------------------------------');
        expect(JSON.parse(output[4])).to.deep.equal({ time: '2014-01-01T00:00:03.000Z', value: 3});
        expect(output[5]).to.equal('--------------------------------------------------------------');
        expect(output[6]).to.equal('==============================================================');
    });

    it('-format "raw" with -ticks true produces correct ticks', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'raw',
            ticks: true,
            fstream: stream
        });

        textSink.consume([{ time: '2014-01-01T00:00:01.000Z', value: 1 }]);
        textSink.tick();
        textSink.consume([{ time: '2014-01-01T00:00:02.000Z', value: 2 }]);
        textSink.tick();
        textSink.consume([{ time: '2014-01-01T00:00:03.000Z', value: 3 }]);
        textSink.tick();
        textSink.eof();

        var output = stream.toString().split('\n');
        expect(JSON.parse(output[0])).to.deep.equal({ time: '2014-01-01T00:00:01.000Z', value: 1});
        expect(output[1]).to.equal('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ');
        expect(JSON.parse(output[2])).to.deep.equal({ time: '2014-01-01T00:00:02.000Z', value: 2});
        expect(output[3]).to.equal('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ');
        expect(JSON.parse(output[4])).to.deep.equal({ time: '2014-01-01T00:00:03.000Z', value: 3});
        expect(output[5]).to.equal('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ');
        expect(output[6]).to.equal('==============================================================');
    });

    it('-format "raw" can display ticks and marks correctly', function() {
        var stream = new streams.WritableStream();
        var textSink = new TextSink({
            format: 'raw',
            marks: true,
            ticks: true,
            fstream: stream
        });

        textSink.consume([{ time: '2014-01-01T00:00:01.000Z', value: 1 }]);
        textSink.tick();
        textSink.mark();
        textSink.consume([{ time: '2014-01-01T00:00:02.000Z', value: 2 }]);
        textSink.tick();
        textSink.mark();
        textSink.consume([{ time: '2014-01-01T00:00:03.000Z', value: 3 }]);
        textSink.tick();
        textSink.eof();

        var output = stream.toString().split('\n');
        expect(JSON.parse(output[0])).to.deep.equal({ time: '2014-01-01T00:00:01.000Z', value: 1});
        expect(output[1]).to.equal('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ');
        expect(output[2]).to.equal('--------------------------------------------------------------');
        expect(JSON.parse(output[3])).to.deep.equal({ time: '2014-01-01T00:00:02.000Z', value: 2});
        expect(output[4]).to.equal('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ');
        expect(output[5]).to.equal('--------------------------------------------------------------');
        expect(JSON.parse(output[6])).to.deep.equal({ time: '2014-01-01T00:00:03.000Z', value: 3});
        expect(output[7]).to.equal('. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ');
        expect(output[8]).to.equal('==============================================================');
    });
});

'use strict';

let base = require('./base');
let Promise = require('bluebird');
let readline = require('readline');
let errors = require('../../errors');

// Simple parser for column-formatted text, such as when parsing the output of
// unix commands like ps, lsof, etc.
//
// Each line is divided by whitespace. The first line is used to determine
// where the columns start, and for each subsequent line, the values are
// mapped into the best fit for the given offset.
//
// This is a bit tricky since some formats end up aligning the columns by the
// left edge, some by the right, and sometimes the values hang over the
// start/end offsets of the header, so we check for all cases as part of the
// parsing.
class ColumnParser extends base {
    // Parse the given line into a set of columns based on whitespace. Returns
    // an array of objects containing start / end offsets of the column  and the
    // text value.
    findColumns(line) {
        let re = /\S+/gm;
        let columns = [];
        let match;
        while ((match = re.exec(line))) {
            columns.push({start: match.index, end: re.lastIndex, value: match[0]});
        }
        return columns;
    }

    // Given a set of headers and values parsed into column specs, return an
    // object containing the best match based on either the start or the end
    // offsets.
    getValues(headers, columns, line) {
        let hidx = 0, cidx = 0;

        var result = {};

        while (hidx < headers.length) {
            let header = headers[hidx];
            let column = columns[cidx];

            // Fill in nulls when there are no more columns
            if (cidx === columns.length) {
                result[header.value] = null;

            // For the last column, grab the full text from the original line to
            // handle cases like ps output where there can be spaces in the
            // final column
            } else if (hidx === headers.length - 1) {
                result[header.value] = line.substr(column.start);

            // If the value text starts anywhere to the left of the column of the
            // header, then it's a match.
            } else if (column.start <= header.end) {
                result[header.value] = column.value;
                cidx++;

            // Otherwise there must be no entry for the given column so skip it
            } else {
                result[header.value] = null;
            }

            hidx++;
        }

        return result;
    }

    parseStream(stream, emit) {
        let buffer = [];

        function drain() {
            if (buffer.length !== 0) {
                let points = buffer;
                buffer = [];
                emit(points);
            }
        }

        return new Promise((resolve, reject) => {
            let liner = readline.createInterface({
                input: stream,
                terminal: false
            });

            let headers = null;

            liner.on('line', (line) => {
                this.totalRead++;
                if (this.doneParsing) {
                    return;
                }

                if (!headers) {
                    headers = this.findColumns(line);
                    return;
                }

                let columns = this.findColumns(line);
                let point = this.getValues(headers, columns, line);
                buffer.push(point);
                this.totalParsed++;

                if (buffer.length >= this.limit) {
                    drain();
                }

                if (this.totalParsed >= this.stopAt) {
                    this.doneParsing = true;
                    drain();
                    liner.close();
                }
            });

            liner.on('close', () => {
                drain();
                if (headers === null) {
                    reject(errors.runtimeError('INVALID-DATA',{
                        type: 'column text',
                        detail: 'no headers'
                    }));
                } else {
                    resolve();
                }
            });
        });
    }
}

module.exports = ColumnParser;

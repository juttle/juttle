'use strict';

// Classes implementing Juttle procs.

var base = require('./base');
var batch = require('./batch');
var emit = require('./emit');
var fanin = require('./fanin');
var filter = require('./filter');
var head = require('./head');
var join = require('./join');
var keep = require('./keep');
var pace = require('./pace');
var pass = require('./pass');
var put = require('./put');
var read = require('./read');
var reduce = require('./reduce');
var remove = require('./remove');
var sequence = require('./sequence');
var sink = require('./sink');
var skip = require('./skip');
var sort = require('./sort');
var source = require('./source');
var split = require('./split');
var tail = require('./tail');
var unbatch = require('./unbatch');
var uniq = require('./uniq');
var view = require('./view');
var write = require('./write');

module.exports = {
    base: base,
    batch: batch,
    emit: emit,
    fanin: fanin,
    filter: filter,
    head: head,
    join: join,
    keep: keep,
    pace: pace,
    pass: pass,
    put: put,
    read: read,
    reduce: reduce,
    remove: remove,
    sequence: sequence,
    sink: sink,
    skip: skip,
    sort: sort,
    source: source,
    split: split,
    tail: tail,
    unbatch: unbatch,
    uniq: uniq,
    view: view,
    write: write
};

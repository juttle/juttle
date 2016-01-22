'use strict';

/* Implementation of Juttle built-in modules. */

var boolean = require('./boolean');
var date = require('./date');
var duration = require('./duration');
var math = require('./math');
var null_ = require('./null');
var array = require('./array');
var number = require('./number');
var regexp = require('./regexp');
var string = require('./string');
var object = require('./object');
var juttle = require('./juttle');
var json = require('./json');

var modules = {
    boolean: boolean,
    array: array,
    date: date,
    duration: duration,
    juttle: juttle,
    json: json,
    math: math,
    null: null_,
    number: number,
    object: object,
    regexp: regexp,
    string: string
};

module.exports = modules;

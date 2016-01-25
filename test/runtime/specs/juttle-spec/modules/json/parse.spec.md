The `JSON.parse` function
=============================

Returns correct result with array
---------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = JSON.parse("[1,2,3]") | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", "result": [1, 2, 3] }

Returns correct result with a nested object
-------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = JSON.parse('[1,2,{ "key": "value" }]') | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", "result": [1, 2, { "key": "value" }] }

Produces an error when argument `string` cannot be parsed
--------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = JSON.parse("[1,2,") | view result

### Warnings

  * Unexpected end of input in string ([1,2,)

Produces an error when argument `string` is not a string
--------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = JSON.parse(1) | view result

### Warnings

  * Invalid argument type for "JSON.parse": expected string

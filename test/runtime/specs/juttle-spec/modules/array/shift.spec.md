The `Array.shift` function
============================

Returns correct result
----------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put array = ['a','b'] | put result = Array.shift(array) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "a", array: ["b"] }

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.shift(null) | view result

### Warnings

  * Invalid argument type for "Array.shift": expected array, received null.

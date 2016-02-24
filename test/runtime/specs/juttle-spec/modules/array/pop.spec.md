The `Array.pop` function
============================

Returns correct result
----------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put array = ['a','b'] | put result = Array.pop(array) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "b", array: ["a"] }

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.pop(null) | view result

### Warnings

  * Invalid argument type for "Array.pop": expected array, received null.

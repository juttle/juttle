The `Array.sort` function
============================

Returns correct result
----------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put array = ['c', 'a','b'] | put result = Array.sort(array) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: ["a", "b", "c"], array: ["a", "b", "c"] }

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.sort(null) | view result

### Warnings

  * Invalid argument type for "Array.sort": expected array, received null.

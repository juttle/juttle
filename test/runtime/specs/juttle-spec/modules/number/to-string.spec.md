The `Number.toString` function
==============================

Returns correct result when passed a number
-------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.toString(5) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "5" }

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.toString(null) | view result

### Warnings

  * Invalid argument type for "Number.toString": expected number, received null.

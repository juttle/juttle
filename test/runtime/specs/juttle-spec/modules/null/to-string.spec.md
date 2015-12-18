The `Null.toString` function
============================

Returns correct result when passed `null`
-----------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Null.toString(null) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "null" }

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Null.toString(5) | view result

### Warnings

  * Invalid argument type for "Null.toString": expected null, received number (5).

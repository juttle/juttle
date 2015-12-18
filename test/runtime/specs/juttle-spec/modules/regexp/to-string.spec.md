The `RegExp.toString` function
==============================

Returns correct result when passed a regexp
-------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = RegExp.toString(/abcd/i) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "/abcd/i" }

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = RegExp.toString(null) | view result

### Warnings

  * Invalid argument type for "RegExp.toString": expected regular expression, received null.

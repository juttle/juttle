The `Boolean.toString` function
===============================

Returns correct result when passed `true`
-----------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Boolean.toString(true) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "true" }

Returns correct result when passed `false`
------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Boolean.toString(false) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "false" }

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Boolean.toString(null) | view result

### Warnings

  * Invalid argument type for "Boolean.toString": expected boolean, received null.

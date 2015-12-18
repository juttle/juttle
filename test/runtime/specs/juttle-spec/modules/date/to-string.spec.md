The `Date.toString` function
==============================

Returns correct result when passed a date
-----------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.toString(:2015-01-01T00:00:00:) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: "2015-01-01T00:00:00.000Z" }

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Date.toString(null) | view result

### Warnings

  * Invalid argument type for "Date.toString": expected date, received null.

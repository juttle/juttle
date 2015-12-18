The `Number.fromString` function
==============================


Returns correct result when passed a string representation of an integer
-----------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.fromString("1") | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 1}


Returns correct result when passed a string representation of a float
---------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.fromString("1.345") | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 1.345}


Returns correct result when passed a string representation of an negative integer
--------------------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.fromString("-1") | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1}


Returns correct result when passed a string representation of a negative float
------------------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.fromString("-1.345") | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1.345}



Returns NaN when passed a string not representing a number
----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.fromString("hello") | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: NaN}


Returns NaN when passed a non-string
------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Number.fromString(null) | view result

### Warnings

  * Invalid argument type for "Number.fromString": expected string, received null.

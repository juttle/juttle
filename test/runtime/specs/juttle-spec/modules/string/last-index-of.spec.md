The `String.lastIndexOf` function
=================================

Returns correct result
----------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.lastIndexOf('canal', 'a') | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: 3 }


Returns correct result when string not found
--------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.lastIndexOf('canal', 'C') | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: -1 }

Produces an error when passed argument `string` of incorrect type
-----------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.lastIndexOf(null, "efgh") | view result

### Warnings

  * Invalid argument type for "String.lastIndexOf": expected string, received null.

Produces an error when passed argument `searchString` of incorrect type
-----------------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.lastIndexOf("abcd", null) | view result

### Warnings

  * Invalid argument type for "String.lastIndexOf": expected string, received null.

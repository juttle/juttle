The `String.match` function
==============================

Returns match info when the match is successful
----------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.match("abcd", /bc/) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: ["bc"] }

Returns `null` when the match is unsuccessful
--------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.match("abcd", /fg/) | view result

### Output

    { "time": "1970-01-01T00:00:00.000Z", result: null }

Produces an error when passed argument `string` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.match(null, /abcd/) | view result

### Warnings

  * Invalid argument type for "String.match": expected string, received null.

Produces an error when passed argument `regexp` of invalid type
---------------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.match("abcd", null) | view result

### Warnings

  * Invalid argument type for "String.match": expected regexp, received null.

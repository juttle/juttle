The `String.fromCharCode` function
============================

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.fromCharCode(null) | view result

### Warnings

  * Invalid argument type for "String.fromCharCode": expected number, received null.

fromCharCode works as expected
-------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
    | put hello = 'hello', world='world'
    | put message = String.fromCharCode(65, 66, 67)
    | keep message
    | view result

### Output

    { message: "ABC" }

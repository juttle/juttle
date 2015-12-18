The `String.concat` function
============================

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = String.concat(null) | view result

### Warnings

  * Invalid argument type for "String.concat": expected string, received null.

Concatenation works as expected
-------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
    | put hello = 'hello', world='world'
    | put message = String.concat(hello, ' ', world)
    | keep message
    | view result

### Output

    { message: "hello world" }

The `Array.concat` function
============================

Produces an error when passed an argument of incorrect type
-----------------------------------------------------------

### Juttle

    emit -from Date.new(0) -limit 1 | put result = Array.concat(null) | view result

### Warnings

  * Invalid argument type for "Array.concat": expected array, received null.

Concatenation works as expected
-------------------------------

### Juttle

    emit -from Date.new(0) -limit 1
    | put hello = ['hello'], world=['world']
    | put message = Array.concat(hello, [], world)
    | keep message
    | view result

### Output

    { message: ["hello", "world"] }

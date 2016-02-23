The `Array.toString` function
==============================

Returns correct result when passed a string
-------------------------------------------

### Juttle

    emit -limit 1 | put result = Array.toString(["hello"]) | keep result | view result

### Output

    { result: "[ \"hello\" ]" }

Produces an error when passed an argument of invalid type
---------------------------------------------------------

### Juttle

    emit -limit 1 | put result = Array.toString(null) | view result

### Warnings

  * Invalid argument type for "Array.toString": expected array, received null.
